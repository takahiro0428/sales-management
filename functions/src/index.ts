import { setGlobalOptions } from "firebase-functions/v2/options";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";

setGlobalOptions({ region: "asia-northeast1" });
import * as nodemailer from "nodemailer";

admin.initializeApp();

const gmailUser = defineSecret("GMAIL_USER");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const gmailSenderName = defineSecret("GMAIL_SENDER_NAME");

interface InvitationData {
  groupId: string;
  groupName: string;
  email: string;
  role: string;
  status: string;
  emailSent: boolean;
  emailError: string | null;
  invitedBy: string;
  invitedByName: string;
  token: string;
  expiresAt: admin.firestore.Timestamp;
}

async function sendInvitationEmail(
  invitationId: string,
  data: InvitationData,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser.value(),
      pass: gmailAppPassword.value(),
    },
  });

  const mailOptions: nodemailer.SendMailOptions = {
    from: `${gmailSenderName.value() || "フリマ売上管理"} <${gmailUser.value()}>`,
    to: data.email,
    subject: `[フリマ売上管理] ${data.groupName} への招待`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b;">グループへの招待</h2>
        <p style="color: #475569;">
          <strong>${data.invitedByName}</strong> さんから
          <strong>${data.groupName}</strong> への招待が届いています。
        </p>
        <p style="color: #475569;">
          ロール: ${data.role === "groupAdmin" ? "グループ管理者" : "メンバー"}
        </p>
        <p style="color: #475569;">
          以下のリンクからアプリにアクセスし、アカウントを作成またはログインしてください。
          ログイン後、招待が自動的に反映されます。
        </p>
        <div style="margin: 24px 0;">
          <a href="https://${process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || ""}.web.app/register?email=${encodeURIComponent(data.email)}"
             style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
            アプリを開く
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">
          この招待は ${data.expiresAt?.toDate ? data.expiresAt.toDate().toLocaleDateString("ja-JP") : "7日後"} まで有効です。
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    await admin.firestore().doc(`invitations/${invitationId}`).update({
      emailSent: true,
      emailError: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "不明なエラー";
    await admin.firestore().doc(`invitations/${invitationId}`).update({
      emailSent: false,
      emailError: errorMessage,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

async function acceptInvitation(
  invitationId: string,
  invData: InvitationData,
  uid: string,
  displayName: string,
): Promise<void> {
  // Check invitation expiry
  if (invData.expiresAt?.toDate && invData.expiresAt.toDate() < new Date()) {
    await admin.firestore().doc(`invitations/${invitationId}`).update({
      status: "expired",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  const memberDocId = `${uid}_${invData.groupId}`;
  const memberRef = admin.firestore().doc(`groupMembers/${memberDocId}`);
  const memberSnap = await memberRef.get();
  if (memberSnap.exists) {
    // Idempotency: already a member, just update invitation status
    await admin.firestore().doc(`invitations/${invitationId}`).update({
      status: "accepted",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }
  const batch = admin.firestore().batch();
  batch.set(memberRef, {
    groupId: invData.groupId,
    uid,
    displayName,
    email: invData.email,
    role: invData.role,
    status: "active",
    joinedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  batch.update(admin.firestore().doc(`invitations/${invitationId}`), {
    status: "accepted",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();
}

// Trigger: invitation created
export const onInvitationCreated = onDocumentCreated(
  {
    document: "invitations/{invitationId}",
    secrets: [gmailUser, gmailAppPassword, gmailSenderName],
  },
  async (event) => {
    const data = event.data?.data() as InvitationData | undefined;
    if (!data) return;
    await sendInvitationEmail(event.params.invitationId, data);

    // Auto-accept if the invited user already has an account
    const usersSnap = await admin.firestore()
      .collection("users")
      .where("email", "==", data.email)
      .limit(1)
      .get();
    if (!usersSnap.empty) {
      const userDoc = usersSnap.docs[0];
      await acceptInvitation(
        event.params.invitationId, data,
        userDoc.id, userDoc.data().displayName || userDoc.data().email || "",
      );
    }
  },
);

// Trigger: invitation updated (for resend — emailSent changed to false)
export const onInvitationUpdated = onDocumentUpdated(
  {
    document: "invitations/{invitationId}",
    secrets: [gmailUser, gmailAppPassword, gmailSenderName],
  },
  async (event) => {
    const before = event.data?.before.data() as InvitationData | undefined;
    const after = event.data?.after.data() as InvitationData | undefined;
    if (!before || !after) return;

    // Resend when emailSent is reset to false while status is pending
    if (after.emailSent === false && after.status === "pending" && after.emailError === null
      && (before.emailSent === true || before.emailError !== null)) {
      await sendInvitationEmail(event.params.invitationId, after);
    }
  },
);

// Trigger: user created — auto-accept pending invitations for this email
export const onUserCreated = onDocumentCreated(
  { document: "users/{uid}" },
  async (event) => {
    const userData = event.data?.data();
    if (!userData?.email) return;

    const invSnap = await admin.firestore()
      .collection("invitations")
      .where("email", "==", userData.email)
      .where("status", "==", "pending")
      .get();

    for (const invDoc of invSnap.docs) {
      await acceptInvitation(
        invDoc.id, invDoc.data() as InvitationData,
        event.params.uid, userData.displayName || userData.email.split("@")[0],
      );
    }
  },
);
