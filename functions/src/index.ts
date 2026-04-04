import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
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
          <a href="https://${process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || ""}.web.app/register"
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
