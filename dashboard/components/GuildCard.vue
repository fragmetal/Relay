<template>
  <div class="p-4 bg-white rounded-2xl shadow hover:shadow-lg transition">
    <div class="flex items-center gap-3">
      <img :src="avatarUrl" class="w-12 h-12 rounded-md" />
      <div>
        <div class="font-semibold">{{ guild.name }}</div>
        <div class="text-sm text-gray-500">{{ guild.id }}</div>
      </div>
    </div>
    <div class="mt-4 flex gap-2">
      <NuxtLink :to="`/guild/${guild.id}`" class="px-3 py-1 rounded-md border">Open</NuxtLink>
      <button class="px-3 py-1 rounded-md bg-indigo-600 text-white">Manage</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({ guild: { type: Object, required: true } })
const avatarUrl = computed(() => props.guild.icon ? `https://cdn.discordapp.com/icons/${props.guild.id}/${props.guild.icon}.png` : '/default-guild.png')
</script>
