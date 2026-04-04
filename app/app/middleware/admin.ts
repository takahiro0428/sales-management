export default defineNuxtRouteMiddleware(async () => {
  const { isPlatformAdmin, authReady, initAuth } = useAuth()

  if (!authReady.value) {
    await initAuth()
  }

  if (!isPlatformAdmin.value) {
    return navigateTo('/')
  }
})
