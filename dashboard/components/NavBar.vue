<template>
  <nav class="flex items-center justify-between p-4">
    <div class="font-bold">{{ appName }}</div>
    <div class="space-x-3">
      <NuxtLink to="/">Home</NuxtLink>
      <NuxtLink to="/dashboard">Dashboard</NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appName = config.public.appName || 'Discord Dashboard'
</script>
