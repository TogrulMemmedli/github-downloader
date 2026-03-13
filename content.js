const BTN_STYLES = 'margin-right: 8px; cursor: pointer; border: 1px solid #d0d7de; background: transparent; border-radius: 4px; padding: 4px; color: #57606a; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; transition: background-color 0.2s;';
const SVG_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path><path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path></svg>`;

// Function to retrieve the token from storage
async function getGithubToken() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['githubToken'], (result) => {
            resolve(result.githubToken || '');
        });
    });
}

async function downloadSingleFile(owner, repo, branch, filePath, token) {
    try {

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
        const apiResponse = await fetch(apiUrl, {
            headers: { 'Authorization': `token ${token}` }
        });
        
        if (!apiResponse.ok) throw new Error(`API error! status: ${apiResponse.status}`);
        
        const fileData = await apiResponse.json();
        
        const fileRes = await fetch(fileData.download_url);
        if (!fileRes.ok) throw new Error("Could not read the file!");
        
        const blob = await fileRes.blob();
        triggerDownload(blob, filePath.split('/').pop());
    } catch (error) {
        console.error("Single file download failed:", error);
        alert("Failed to download the file. Please check if your token is valid.");
    }
}

async function fetchFolderContents(owner, repo, branch, folderPath, zipFolder, token) {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${folderPath}?ref=${branch}`;
    
    const headers = { 'Authorization': `token ${token}` };

    const response = await fetch(apiUrl, { headers });
    
    if (response.status === 403 || response.status === 429) {
        throw new Error("GitHub API rate limit exceeded! Your token might be invalid or expired.");
    }
    if (!response.ok) throw new Error(`API error! status: ${response.status}`);
    
    const items = await response.json();

    const promises = items.map(async (item) => {
        if (item.type === "file") {
            const fileRes = await fetch(item.download_url); 
            const blob = await fileRes.blob();
            zipFolder.file(item.name, blob);
        } else if (item.type === "dir") {
            const newZipFolder = zipFolder.folder(item.name);
            await fetchFolderContents(owner, repo, branch, item.path, newZipFolder, token);
        }
    });

    await Promise.all(promises);
}

async function downloadFolderAsZip(owner, repo, branch, folderPath, token) {
    try {
        const zip = new JSZip();
        await fetchFolderContents(owner, repo, branch, folderPath, zip, token);
        
        const content = await zip.generateAsync({type: "blob"});
        triggerDownload(content, `${folderPath.split('/').pop()}.zip`);
    } catch (error) {
        console.error("Folder download failed:", error);
        alert(`${error.message}`);
    }
}

function triggerDownload(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

function parseGitHubUrl(url) {
    const urlParts = new URL(url).pathname.split('/').filter(Boolean);
    if (urlParts.length < 4) return null;
    return {
        owner: urlParts[0],
        repo: urlParts[1],
        type: urlParts[2],
        branch: urlParts[3],
        path: urlParts.slice(4).join('/')
    };
}

function addDownloadButtons() {
    const rows = document.querySelectorAll('.react-directory-row');

    rows.forEach(row => {
        if (row.querySelector('.github-dl-btn')) return;

        const btn = document.createElement('button');
        btn.innerHTML = SVG_ICON;
        btn.className = 'github-dl-btn'; 
        btn.style.cssText = BTN_STYLES;
        btn.title = "Download";
        
        btn.onmouseenter = () => btn.style.backgroundColor = '#f3f4f6';
        btn.onmouseleave = () => btn.style.backgroundColor = 'transparent';
        
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();


            const token = await getGithubToken();
            if (!token) {
                alert("⚠️ Please add your GitHub Personal Access Token in the extension settings (click the puzzle icon) to enable downloading.");
                return; 
            }
            
            const linkElement = row.querySelector('a.Link--primary');
            if (!linkElement) return;

            const repoDetails = parseGitHubUrl(linkElement.href);
            if (!repoDetails) return;

            const { owner, repo, type, branch, path } = repoDetails;

            try {
                btn.style.opacity = '0.4';
                btn.style.pointerEvents = 'none';

                if (type === 'blob') {

                    await downloadSingleFile(owner, repo, branch, path, token);
                } else if (type === 'tree') {
                    await downloadFolderAsZip(owner, repo, branch, path, token);
                }
            } finally {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
        });

        const nameCell = row.querySelector('.react-directory-row-name-cell-large-screen') || row.querySelector('[role="rowheader"]');
        if (nameCell) {
            let flexContainer = nameCell.querySelector('div');
            if (!flexContainer) flexContainer = nameCell;
            
            flexContainer.style.display = 'flex';
            flexContainer.style.alignItems = 'center';
            flexContainer.insertBefore(btn, flexContainer.firstChild);
        }
    });
}

const observer = new MutationObserver(() => { addDownloadButtons(); });
observer.observe(document.body, { childList: true, subtree: true });

addDownloadButtons();
