export const useDiscordAuth = () => {
  const config = useRuntimeConfig()

  const redirectToDiscord = () => {
    const clientId = config.public.discordClientId
    const redirectUri = encodeURIComponent(config.public.discordRedirectUri)
    const scope = encodeURIComponent('identify email guilds')
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`
    window.location.href = url
  }

  return { redirectToDiscord }
}
