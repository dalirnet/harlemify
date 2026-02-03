<script setup lang="ts">
import { postStore, type Post } from "../stores/post";

const { posts, listPost, createPost, updatePost, deletePost, postMonitor } = useStoreAlias(postStore);

const showModal = ref(false);
const editing = ref<Post | null>(null);
const form = ref({ title: "", body: "", userId: 1 });

onMounted(() => listPost());

function openCreate() {
    editing.value = null;
    form.value = { title: "", body: "", userId: 1 };
    showModal.value = true;
}

function openEdit(post: Post) {
    editing.value = post;
    form.value = { title: post.title, body: post.body, userId: post.userId };
    showModal.value = true;
}

async function save() {
    if (editing.value) {
        await updatePost({
            id: editing.value.id,
            title: form.value.title,
            body: form.value.body,
        });
    } else {
        await createPost({ id: Date.now(), ...form.value });
    }
    showModal.value = false;
}

async function remove(post: Post) {
    if (confirm(`Delete "${post.title}"?`)) {
        await deletePost({ id: post.id });
    }
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Posts</h1>
            <p>Collection store using <code>useStoreAlias</code> composable</p>
        </div>

        <div class="toolbar">
            <h2>{{ posts.length }} posts</h2>
            <button class="btn btn-primary" @click="openCreate">Add Post</button>
        </div>

        <div v-if="postMonitor.list.pending()" class="loading">Loading...</div>

        <div v-else class="list">
            <div v-for="post in posts.slice(0, 15)" :key="post.id" class="list-item">
                <div>
                    <h3>{{ post.title }}</h3>
                    <p>{{ post.body.substring(0, 80) }}...</p>
                </div>
                <div class="list-actions">
                    <button class="btn btn-sm" @click="openEdit(post)">Edit</button>
                    <button class="btn btn-sm btn-danger" @click="remove(post)">Delete</button>
                </div>
            </div>
        </div>

        <!-- Feature Explanation -->
        <div class="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li><code>Memory.units()</code> - Collection pattern for managing lists</li>
                <li><code>Memory.units().add()</code> - Append new items to collection</li>
                <li><code>Memory.units().edit()</code> - Update existing items by indicator</li>
                <li><code>Memory.units().drop()</code> - Remove items from collection</li>
                <li><code>postMonitor.[action].current()</code> - Current status enum value</li>
                <li><code>postMonitor.[action].idle()/pending()/success()/failed()</code> - Boolean status flags</li>
            </ul>
        </div>

        <!-- Monitor Status -->
        <div class="monitor-status" data-testid="monitor-status">
            <h3>Monitor Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item">
                    <span class="monitor-label">list</span>
                    <span class="monitor-state" :data-status="postMonitor.list.current()">{{
                        postMonitor.list.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="postMonitor.list.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="postMonitor.list.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="postMonitor.list.success()" class="flag" data-flag="success">success</span>
                        <span v-if="postMonitor.list.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">create</span>
                    <span class="monitor-state" :data-status="postMonitor.create.current()">{{
                        postMonitor.create.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="postMonitor.create.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="postMonitor.create.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="postMonitor.create.success()" class="flag" data-flag="success">success</span>
                        <span v-if="postMonitor.create.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">update</span>
                    <span class="monitor-state" :data-status="postMonitor.update.current()">{{
                        postMonitor.update.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="postMonitor.update.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="postMonitor.update.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="postMonitor.update.success()" class="flag" data-flag="success">success</span>
                        <span v-if="postMonitor.update.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">delete</span>
                    <span class="monitor-state" :data-status="postMonitor.delete.current()">{{
                        postMonitor.delete.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="postMonitor.delete.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="postMonitor.delete.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="postMonitor.delete.success()" class="flag" data-flag="success">success</span>
                        <span v-if="postMonitor.delete.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
            </div>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal">
                <h2>{{ editing ? "Edit Post" : "Add Post" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>Title</label>
                        <input v-model="form.title" required >
                    </div>
                    <div class="form-group">
                        <label>Body</label>
                        <textarea v-model="form.body" rows="4" required />
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" @click="showModal = false">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
