export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'private, max-age=0, must-revalidate')

  return readPublicAboutPage()
})
