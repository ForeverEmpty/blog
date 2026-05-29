export default defineEventHandler(async () => {
  const friends = await readFriends()

  return friends.filter((friend) => friend.status === '已通过')
})
