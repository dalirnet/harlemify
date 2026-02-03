<script setup lang="ts">
import { configStore } from "../stores/config";

const { config, getConfig, updateConfig, configMonitor } = useStoreAlias(configStore);

const languageInput = ref("");

onMounted(() => getConfig());

watch(
    config,
    (val) => {
        if (val) {
            languageInput.value = val.language;
            document.documentElement.setAttribute("data-theme", val.theme);
        }
    },
    { immediate: true },
);

async function toggleTheme() {
    if (!config.value) return;
    const newTheme = config.value.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    await updateConfig({
        id: config.value.id,
        theme: newTheme,
    });
}

async function updateLanguage() {
    if (!config.value || !languageInput.value.trim()) return;
    await updateConfig({
        id: config.value.id,
        language: languageInput.value.trim(),
    });
}

async function toggleNotifications() {
    if (!config.value) return;
    await updateConfig({
        id: config.value.id,
        notifications: !config.value.notifications,
    });
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Config</h1>
            <p>Singleton store using <code>useStoreAlias</code> composable</p>
        </div>

        <div v-if="configMonitor.get.pending()" class="loading">Loading...</div>

        <div v-else-if="config" class="config-list">
            <div class="config-item">
                <div>
                    <strong>Theme</strong>
                    <span class="value">{{ config.theme }}</span>
                </div>
                <button class="btn btn-sm" @click="toggleTheme">Toggle</button>
            </div>

            <div class="config-item">
                <div>
                    <strong>Language</strong>
                </div>
                <form class="config-input" @submit.prevent="updateLanguage">
                    <input v-model="languageInput" type="text" >
                    <button type="submit" class="btn btn-sm">Update</button>
                </form>
            </div>

            <div class="config-item">
                <div>
                    <strong>Notifications</strong>
                    <span class="value">{{ config.notifications ? "on" : "off" }}</span>
                </div>
                <button class="btn btn-sm" @click="toggleNotifications">Toggle</button>
            </div>

            <div class="detail">
                <h3>Raw Data (config)</h3>
                <pre>{{ JSON.stringify(config, null, 2) }}</pre>
            </div>

            <!-- Monitor Status -->
            <div class="monitor-status" data-testid="monitor-status">
                <h3>Monitor Status</h3>
                <div class="monitor-grid">
                    <div class="monitor-item">
                        <span class="monitor-label">get</span>
                        <span class="monitor-state" :data-status="configMonitor.get.current()">{{
                            configMonitor.get.current()
                        }}</span>
                        <span class="monitor-flags">
                            <span v-if="configMonitor.get.idle()" class="flag" data-flag="idle">idle</span>
                            <span v-if="configMonitor.get.pending()" class="flag" data-flag="pending">pending</span>
                            <span v-if="configMonitor.get.success()" class="flag" data-flag="success">success</span>
                            <span v-if="configMonitor.get.failed()" class="flag" data-flag="failed">failed</span>
                        </span>
                    </div>
                    <div class="monitor-item">
                        <span class="monitor-label">update</span>
                        <span class="monitor-state" :data-status="configMonitor.update.current()">{{
                            configMonitor.update.current()
                        }}</span>
                        <span class="monitor-flags">
                            <span v-if="configMonitor.update.idle()" class="flag" data-flag="idle">idle</span>
                            <span v-if="configMonitor.update.pending()" class="flag" data-flag="pending">pending</span>
                            <span v-if="configMonitor.update.success()" class="flag" data-flag="success">success</span>
                            <span v-if="configMonitor.update.failed()" class="flag" data-flag="failed">failed</span>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Feature Info -->
            <div class="feature-info">
                <h3>Features Demonstrated</h3>
                <ul>
                    <li><code>Memory.unit()</code> - Singleton state management</li>
                    <li><code>Memory.unit().edit()</code> - Partial update (merge)</li>
                    <li><code>configMonitor.[action].current()</code> - Current status enum value</li>
                    <li>
                        <code>configMonitor.[action].idle()/pending()/success()/failed()</code> - Boolean status flags
                    </li>
                    <li>Schema <code>.meta({ actions: [...] })</code> - Field-level action config</li>
                </ul>
            </div>
        </div>

        <div v-else class="loading">No config available</div>
    </div>
</template>

<style scoped>
.feature-info {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.feature-info h3 {
    margin-bottom: 12px;
}

.feature-info ul {
    margin: 0;
    padding-left: 20px;
}

.feature-info li {
    margin-bottom: 8px;
}

.feature-info code {
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
}

.monitor-status {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.monitor-status h3 {
    margin-bottom: 12px;
}

.monitor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.monitor-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
}

.monitor-label {
    font-weight: 600;
    font-size: 14px;
}

.monitor-state {
    font-family: monospace;
    font-size: 13px;
    color: var(--text-muted);
}

.monitor-flags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.flag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.flag[data-flag="idle"] {
    background: #6b7280;
    color: white;
}

.flag[data-flag="pending"] {
    background: #f59e0b;
    color: white;
}

.flag[data-flag="success"] {
    background: #10b981;
    color: white;
}

.flag[data-flag="failed"] {
    background: #ef4444;
    color: white;
}
</style>
