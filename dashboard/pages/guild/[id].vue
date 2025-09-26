<template>
  <div class="p-6">
    <NavBar />
    <h2 class="text-2xl font-bold mb-4">Guild Settings</h2>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <label class="block mb-2">Prefix</label>
      <input v-model="settings.prefix" class="p-2 border rounded w-64" />
      <div class="mt-4">
        <button @click="save" class="px-4 py-2 bg-indigo-600 text-white rounded">Save</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import NavBar from '~/components/NavBar.vue'
import { ref, onMounted } from 'vue'
const route = useRoute()
const id = route.params.id
const loading = ref(true)
const settings = ref({ prefix: '!' })
onMounted(async () => {
  const res = await $fetch('/api/settings', { params: { guildId: id } })
  settings.value = res.settings || { prefix: '!' }
  loading.value = false
})
const save = async () => {
  await $fetch('/api/settings', { method: 'POST', body: { guildId: id, settings: settings.value } })
  alert('Saved')
}
</script>
