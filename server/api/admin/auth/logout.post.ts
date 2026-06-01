export default defineEventHandler((event) => {
  clearAdminSession(event)

  return {
    authenticated: false
  }
})
