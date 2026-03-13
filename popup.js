document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('tokenInput');
    const saveBtn = document.getElementById('saveBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const saveStatus = document.getElementById('saveStatus');
    const donateBtn = document.getElementById('donateBtn');
    const thanksMsg = document.getElementById('thanksMsg');

    chrome.storage.sync.get(['githubToken', 'hasDonated'], (result) => {
        if (result.githubToken) {
            tokenInput.value = result.githubToken;
        }
        
        if (result.hasDonated) {
            donateBtn.style.display = 'none';
            thanksMsg.innerText = "Thank you so much! 💖 Your support keeps us going!";
            thanksMsg.style.display = 'block';
        }
    });

    saveBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        chrome.storage.sync.set({ githubToken: token }, () => {
            saveStatus.innerText = 'Saved successfully! ✅';
            saveStatus.className = 'status-msg success-text';
            saveStatus.style.display = 'block';
            setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
        });
    });

    deleteBtn.addEventListener('click', () => {
        chrome.storage.sync.remove(['githubToken'], () => {
            tokenInput.value = ''; 
            saveStatus.innerText = 'Token deleted! 🗑️';
            saveStatus.className = 'status-msg danger-text';
            saveStatus.style.display = 'block';
            setTimeout(() => { saveStatus.style.display = 'none'; }, 2000);
        });
    });

    donateBtn.addEventListener('click', () => {
        window.open('https://github.com/TogrulMemmedli/github-downloader', '_blank');

        chrome.storage.sync.set({ hasDonated: true }, () => {
            donateBtn.style.display = 'none';
            thanksMsg.innerText = "Thank you for starring the project! 🌟 Your support means a lot!";
            thanksMsg.style.display = 'block';
        });
    });
});
