export default defineEventHandler((event) => {
  const context = getSiteFeedContext()
  const rssUrl = absoluteSiteUrl('/rss.xml')
  const atomUrl = absoluteSiteUrl('/atom.xml')

  setHeader(event, 'content-type', 'text/x-opml; charset=utf-8')
  setHeader(event, 'cache-control', 'max-age=900, stale-while-revalidate=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(context.siteName)} subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
    <ownerName>${escapeXml(context.author.name)}</ownerName>
  </head>
  <body>
    <outline text="${escapeXml(context.siteName)}" title="${escapeXml(context.siteName)}">
      <outline text="RSS" title="${escapeXml(context.siteName)} RSS" type="rss" xmlUrl="${escapeXml(rssUrl)}" htmlUrl="${escapeXml(context.siteUrl)}" description="${escapeXml(context.siteDescription)}" />
      <outline text="Atom" title="${escapeXml(context.siteName)} Atom" type="atom" xmlUrl="${escapeXml(atomUrl)}" htmlUrl="${escapeXml(context.siteUrl)}" description="${escapeXml(context.siteDescription)}" />
    </outline>
  </body>
</opml>`
})
