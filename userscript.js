// ==UserScript==
// @name         Steam Family Wishlist Highlight
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Highlights games on your Steam wishlist that are already owned by a Steam Family member.
// @match        *://store.steampowered.com/wishlist/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log("Steam Family Wishlist Highlight: Userscript loaded");

    const CACHE_TTL_MS = 10 * 60 * 1000;

    const style = document.createElement('style');
    style.textContent = `
    .family-shared-highlight {
        background-color: rgba(50, 205, 50, 0.15) !important;
        border: 2px solid limegreen !important;
        border-radius: 4px;
        box-shadow: 0 0 10px rgba(50, 205, 50, 0.3);
        transition: all 0.2s ease-in-out;
    }
    `;
    document.head.append(style);

    async function getCachedData(key, fetchFunction) {
        const cached = sessionStorage.getItem(key);
        if (cached) {
            try {
                const { timestamp, data } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL_MS) {
                    return data;
                }
            } catch (e) {
                console.warn(`Steam Family Wishlist: Failed to parse cache for ${key}`);
            }
        }

        const data = await fetchFunction();
        if (data && data.length > 0) {
            sessionStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
        }
        return data;
    }

    async function getSteamToken() {
        const appConfig = document.getElementById('application_config');
        if (appConfig) {
            try {
                const config = JSON.parse(appConfig.getAttribute('data-store_user_config'));
                if (config?.webapi_token) return config.webapi_token;
            } catch (e) {}
        }

        try {
            const res = await fetch('https://store.steampowered.com/', { credentials: 'include' });
            const text = await res.text();
            const configMatch = text.match(/data-store_user_config="([^"]+)"/);
            if (configMatch) {
                const config = JSON.parse(configMatch[1].replace(/&quot;/g, '"'));
                if (config?.webapi_token) return config.webapi_token;
            }
        } catch (e) {
            console.error("Steam Family Wishlist: Failed fetching homepage for token.", e);
        }
        return null;
    }

    async function fetchSharedApps(token) {
        try {
            const groupRes = await fetch(`https://api.steampowered.com/IFamilyGroupsService/GetFamilyGroupForUser/v1/?access_token=${token}`);
            if (!groupRes.ok) return[];

            const groupData = await groupRes.json();
            const familyGroupId = groupData.response?.family_groupid;
            if (!familyGroupId) return[];

            const appsRes = await fetch(`https://api.steampowered.com/IFamilyGroupsService/GetSharedLibraryApps/v1/?access_token=${token}&family_groupid=${familyGroupId}&include_own=false`);
            if (!appsRes.ok) return[];

            const appsData = await appsRes.json();
            return (appsData.response?.apps ||[]).map(app => app.appid);
        } catch (error) {
            return[];
        }
    }

    async function fetchOwnedApps() {
        try {
            const response = await fetch('https://store.steampowered.com/dynamicstore/userdata/');
            const data = await response.json();
            return data.rgOwnedApps ||[];
        } catch (error) {
            return[];
        }
    }

    function highlightSharedGames(accessibleAppsSet) {
        const unhighlightedRows = document.querySelectorAll('[data-rfd-draggable-id]:not(.family-shared-highlight)');
        if (unhighlightedRows.length === 0) return;

        unhighlightedRows.forEach(row => {
            const draggableId = row.getAttribute('data-rfd-draggable-id');
            if (!draggableId || !draggableId.startsWith('WishlistItem-')) return;

            const appId = parseInt(draggableId.split('-')[1], 10);
            if (isNaN(appId)) return;

            if (accessibleAppsSet.has(appId)) {
                row.classList.add('family-shared-highlight');
                if (!row.hasAttribute('title')) {
                    row.setAttribute('title', 'This game is already in your Steam Family Library');
                }
            }
        });
    }

    async function main() {
        const token = await getSteamToken();
        if (!token) {
            console.warn("Steam Family Wishlist: Could not retrieve WebAPI token.");
            return;
        }

        const [ownedApps, sharedApps] = await Promise.all([
            getCachedData('steam_owned_apps_cache', fetchOwnedApps),
                                                          getCachedData('steam_family_apps_cache', () => fetchSharedApps(token))
        ]);

        const accessibleAppsSet = new Set([...(ownedApps || []), ...(sharedApps ||[])]);

        if (accessibleAppsSet.size === 0) return;

        highlightSharedGames(accessibleAppsSet);

        let scheduledAnimationFrame = false;
        const observer = new MutationObserver((mutations) => {
            if (scheduledAnimationFrame) return;

            const hasSignificantAddedNodes = mutations.some(m =>
            m.addedNodes.length > 0 && m.addedNodes[0].nodeType === 1
            );

            if (hasSignificantAddedNodes) {
                scheduledAnimationFrame = true;
                requestAnimationFrame(() => {
                    highlightSharedGames(accessibleAppsSet);
                    scheduledAnimationFrame = false;
                });
            }
        });

        const container = document.getElementById('wishlist_ctn') || document.body;
        observer.observe(container, { childList: true, subtree: true });
    }

    main();
})();
