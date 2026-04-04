import { initializeApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  }

  const requiredKeys = ['apiKey', 'authDomain', 'projectId'] as const
  const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key])
  if (missingKeys.length > 0) {
    console.error(
      `[Firebase] 必須の設定値が未設定です: ${missingKeys.join(', ')}。.env ファイルを確認してください。` +
      ' 必要な環境変数: NUXT_PUBLIC_FIREBASE_API_KEY, NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NUXT_PUBLIC_FIREBASE_PROJECT_ID',
    )
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  const auth = getAuth(app)
  await setPersistence(auth, browserLocalPersistence)
  const firestore = getFirestore(app)
  const storage = getStorage(app)

  return {
    provide: {
      firebaseApp: app,
      firebaseAuth: auth,
      firestore,
      firebaseStorage: storage,
    },
  }
})
