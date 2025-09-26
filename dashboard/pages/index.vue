<!-- pages/index.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-slate-50">
    <div class="max-w-md w-full p-8 bg-white/90 backdrop-blur rounded-2xl shadow-lg text-center">
      <h1 class="text-3xl font-extrabold">Welcome</h1>
      <p class="mt-4 text-lg">Sign in to access your Discord Bot dashboard.</p>
      <div class="mt-6">
        <button
          @click="login"
          class="px-6 py-3 rounded-xl font-semibold shadow bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Sign in with Discord
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDiscordAuth } from '~/composables/useDiscordAuth'
import { useRouter } from 'vue-router'

const { redirectToDiscord, handleDiscordCallback } = useDiscordAuth()
const router = useRouter()

const login = () => {
  redirectToDiscord()
}

// Check for OAuth callback (e.g., /?code=xxx)
onMounted(async () => {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (code) {
    try {
      const { userId } = await handleDiscordCallback(code)
      // Save user session
      localStorage.setItem('dashboardUserId', userId)
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Login failed', err)
    }
  }
})
</script>
