<script setup lang="ts">
import { useStoreCompose } from "../../src/runtime";
import { dashboardStore, type User, type Todo } from "../stores/dashboard";

// useStoreCompose
const loadAll = useStoreCompose(dashboardStore, "loadAll");
const resetAll = useStoreCompose(dashboardStore, "resetAll");
const quickAdd = useStoreCompose(dashboardStore, "quickAdd");

// Quick-add form
const newUserName = ref("");
const newTodoTitle = ref("");

onMounted(() => loadAll.execute());

async function handleQuickAdd() {
    if (!newUserName.value || !newTodoTitle.value) return;
    await quickAdd.execute(newUserName.value, newTodoTitle.value);
    newUserName.value = "";
    newTodoTitle.value = "";
}

function selectUser(user: User) {
    dashboardStore.compose.selectUser(user);
}

function clearSelection() {
    dashboardStore.model.user.reset();
}

async function toggleTodo(todo: Todo) {
    await dashboardStore.action.toggleTodo({ payload: todo });
}

async function completeAll() {
    await dashboardStore.compose.completeAll();
}

async function resetDashboard() {
    await resetAll.execute();
}

async function deleteUser(user: User) {
    dashboardStore.model.user.set(user);
    await dashboardStore.action.deleteUser();
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Dashboard</h1>
            <p>Compose layer — orchestrate actions, models, and views</p>
        </div>

        <!-- Summary -->
        <div class="summary-grid" data-testid="summary">
            <div class="summary-card">
                <span class="summary-value" data-testid="summary-users">{{ dashboardStore.view.summary.value?.users ?? 0 }}</span>
                <span class="summary-label">Users</span>
            </div>
            <div class="summary-card">
                <span class="summary-value" data-testid="summary-todos">{{ dashboardStore.view.summary.value?.todos ?? 0 }}</span>
                <span class="summary-label">Todos</span>
            </div>
            <div class="summary-card">
                <span class="summary-value" data-testid="summary-pending">{{ dashboardStore.view.summary.value?.pending ?? 0 }}</span>
                <span class="summary-label">Pending</span>
            </div>
            <div class="summary-card">
                <span class="summary-value" data-testid="summary-done">{{ dashboardStore.view.summary.value?.done ?? 0 }}</span>
                <span class="summary-label">Done</span>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
            <button class="btn btn-primary" data-testid="load-all" :disabled="loadAll.active.value" @click="loadAll.execute()">
                {{ loadAll.active.value ? "Loading..." : "Load All" }}
            </button>
            <button class="btn" data-testid="complete-all" @click="completeAll">Complete All Todos</button>
            <button class="btn btn-danger" data-testid="reset-all" @click="resetDashboard">Reset All</button>
        </div>

        <!-- Quick Add (compose with typed args) -->
        <div class="section" data-testid="quick-add-section">
            <h2>Quick Add</h2>
            <p class="subtitle"><code>compose.quickAdd(userName, todoTitle)</code> — typed arguments</p>
            <form class="quick-add-form" @submit.prevent="handleQuickAdd">
                <input v-model="newUserName" placeholder="User name" data-testid="input-user-name" >
                <input v-model="newTodoTitle" placeholder="Todo title" data-testid="input-todo-title" >
                <button type="submit" class="btn btn-primary" data-testid="quick-add" :disabled="quickAdd.active.value">
                    {{ quickAdd.active.value ? "Adding..." : "Quick Add" }}
                </button>
            </form>
        </div>

        <!-- Users -->
        <div class="section" data-testid="users-section">
            <h2>Users ({{ dashboardStore.view.userCount.value }})</h2>
            <div class="list" data-testid="user-list">
                <div
                    v-for="u in dashboardStore.view.users.value"
                    :key="u.id"
                    class="list-item"
                    :class="{ 'list-item-selected': dashboardStore.view.user.value?.id === u.id }"
                    :data-testid="`user-${u.id}`"
                >
                    <div>
                        <h3 data-testid="user-name">{{ u.name }}</h3>
                        <p class="subtitle" data-testid="user-email">{{ u.email }}</p>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-sm" data-testid="select-user" @click="selectUser(u)">Select</button>
                        <button class="btn btn-sm btn-danger" data-testid="delete-user" @click="deleteUser(u)">Delete</button>
                    </div>
                </div>
            </div>
            <div v-if="dashboardStore.view.user.value" class="detail" data-testid="selected-user">
                <h3>Selected User</h3>
                <pre>{{ JSON.stringify(dashboardStore.view.user.value, null, 2) }}</pre>
                <button class="btn btn-sm" style="margin-top: 8px" data-testid="clear-selection" @click="clearSelection">Clear</button>
            </div>
        </div>

        <!-- Todos -->
        <div class="section" data-testid="todos-section">
            <h2>Todos ({{ dashboardStore.view.todoCount.value }})</h2>
            <div class="list" data-testid="todo-list">
                <div
                    v-for="t in dashboardStore.view.todos.value"
                    :key="t.id"
                    class="list-item"
                    :data-testid="`todo-${t.id}`"
                >
                    <div>
                        <h3 :style="{ textDecoration: t.done ? 'line-through' : 'none' }" data-testid="todo-title">{{ t.title }}</h3>
                        <p class="subtitle">{{ t.done ? "Done" : "Pending" }}</p>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-sm" data-testid="toggle-todo" @click="toggleTodo(t)">
                            {{ t.done ? "Undo" : "Done" }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Compose Active States -->
        <div class="section" data-testid="compose-status">
            <h2>Compose Active States</h2>
            <div class="demo-block">
                <div class="demo-grid">
                    <div class="demo-item">
                        <span class="demo-label">loadAll.active</span>
                        <span class="demo-value" data-testid="active-load-all">{{ loadAll.active.value }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">quickAdd.active</span>
                        <span class="demo-value" data-testid="active-quick-add">{{ quickAdd.active.value }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">resetAll.active</span>
                        <span class="demo-value" data-testid="active-reset-all">{{ resetAll.active.value }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">completeAll.active</span>
                        <span class="demo-value" data-testid="active-complete-all">{{ dashboardStore.compose.completeAll.active.value }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">selectUser.active</span>
                        <span class="demo-value" data-testid="active-select-user">{{ dashboardStore.compose.selectUser.active.value }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Feature Info -->
        <div class="feature-info" data-testid="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li><code>compose(({ model, action }) => ({ ... }))</code> — define composed operations</li>
                <li><code>store.compose.loadAll()</code> — no-arg compose: orchestrate multiple actions</li>
                <li><code>store.compose.resetAll()</code> — no-arg compose: reset multiple models</li>
                <li><code>store.compose.selectUser(user)</code> — typed arg: <code>(user: User) => void</code></li>
                <li><code>store.compose.quickAdd(name, title)</code> — typed args: <code>(string, string) => Promise&lt;void&gt;</code></li>
                <li><code>store.compose.completeAll()</code> — batch model mutations</li>
                <li><code>compose.active</code> — reactive boolean, true while executing</li>
                <li><code>useStoreCompose(store, key)</code> — composable: <code>{ execute, active }</code></li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
.summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
}

.summary-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 20px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.summary-value {
    font-size: 32px;
    font-weight: 700;
}

.summary-label {
    font-size: 13px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.section {
    margin-top: 32px;
}

.section > h2 {
    margin-bottom: 12px;
}

.quick-add-form {
    display: flex;
    gap: 8px;
    align-items: center;
}

.quick-add-form input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-secondary);
    color: var(--text);
}

.list-item-selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent);
}

.demo-block {
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
}

.demo-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: var(--bg-tertiary);
    border-radius: 6px;
}

.demo-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
}

.demo-value {
    font-family: monospace;
    font-size: 13px;
}

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
</style>
