<template>
  <div class="p-6">
    <NavBar />
    <h2 class="text-2xl font-bold mb-4">Your Servers</h2>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <GuildCard v-for="g in guilds" :key="g.id" :guild="g" />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavBar from '~/components/NavBar.vue'
import GuildCard from '~/components/GuildCard.vue'
import { onMounted, ref } from 'vue'
const guilds = ref([])
onMounted(async () => {
  // attempt to read session cookie user id from an endpoint could be implemented; here we look for localStorage fallback
  const userId = localStorage.getItem('dashboardUserId')
  if (!userId) return
  const res = await $fetch('/api/guilds', { params: { userId } })
  guilds.value = res.guilds || []
})
</script>
