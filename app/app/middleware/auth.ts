export default defineNuxtRouteMiddleware(async () => {
  const { isAuthenticated, authReady, initAuth } = useAuth()

  if (!authReady.value) {
    await initAuth()
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
