<template>
    <div class="container">
        <header class="header">
            <h1>Harlemify</h1>
            <p>API State Management for Nuxt 3+</p>
        </header>

        <div class="home-grid">
            <NuxtLink to="/config" class="home-card">
                <h2>Config</h2>
                <p>Singleton store with <code>*Unit</code> actions</p>
                <span class="badge">memorizedUnit</span>
            </NuxtLink>

            <NuxtLink to="/users" class="home-card">
                <h2>Users</h2>
                <p>Collection store with <code>*Units</code> actions</p>
                <span class="badge">memorizedUnits</span>
            </NuxtLink>

            <NuxtLink to="/posts" class="home-card">
                <h2>Posts</h2>
                <p>Collection store with <code>*Units</code> actions</p>
                <span class="badge">memorizedUnits</span>
            </NuxtLink>

            <NuxtLink to="/projects" class="home-card">
                <h2>Projects</h2>
                <p>Nested schema with <code>Memory.unit("field")</code></p>
                <span class="badge">nested paths</span>
            </NuxtLink>
        </div>

        <footer class="footer">
            <a href="https://github.com/diphyx/harlemify" target="_blank">@diphyx/harlemify</a>
        </footer>
    </div>
</template>
