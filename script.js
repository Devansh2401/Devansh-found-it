
const firebaseConfig = {
    apiKey: "AIzaSyCK1Dv_jFaLuXApiCXTA45D0oF6FGFB2SQ",
    authDomain: "campusfoundit.firebaseapp.com",
    projectId: "campusfoundit",
    storageBucket: "campusfoundit.firebasestorage.app",
    appId: "1:151417592098:web:1cb43b26bdb596236e2d7b"
};
const GEMINI_KEY = "AIzaSyD0BFLyKGnTKBo4Q9APVVkVaqgkTAZp4qU";


firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let activeType = 'found'; 


function showForm(type) {
    activeType = type;
    document.getElementById('formOverlay').style.display = 'flex';
    document.getElementById('formTitle').innerText = type === 'found' ? "📢 Report Found Item" : "🔍 Request Lost Item";
    document.body.style.overflow = 'hidden'; 
}

function hideForm() {
    document.getElementById('formOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function updateFileName() {
    const file = document.getElementById('imageInput').files[0];
    const display = document.getElementById('fileNameDisplay');
    const status = document.getElementById('status');
    
    if(file) {
        display.innerText = `✅ Attached: ${file.name}`;
        status.innerText = "● IMAGE READY FOR AI SCAN";
        status.style.color = "var(--accent)";
    }
}


async function resizeImg(file, maxW) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scale = maxW / img.width;
                canvas.width = maxW; 
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
        };
    });
}


document.getElementById('aiBtn').addEventListener('click', async () => {
    const file = document.getElementById('imageInput').files[0];
    if (!file) return alert("Please select an item photo first!");

    const statusEl = document.getElementById('status');
    statusEl.innerText = "⌛ AI ANALYZING IMAGE...";
    statusEl.style.color = "var(--purple)";

    try {
        const base64Data = (await resizeImg(file, 300)).split(',')[1];
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Identify this object. Provide only the item name, generic name without colour campany modal or anything." },
                        { inline_data: { mime_type: "image/jpeg", data: base64Data } }
                    ]
                }]
            })
        });

        const result = await response.json();
        const aiDescription = result.candidates[0].content.parts[0].text;
        
        document.getElementById('manualDesc').value = aiDescription.trim();
        statusEl.innerText = "● AI SCAN SUCCESS";
        statusEl.style.color = "var(--success)";
    } catch (error) {
        console.error(error);
        statusEl.innerText = "● AI ERROR: TRY MANUAL";
        statusEl.style.color = "var(--danger)";
    }
});


document.getElementById('geoBtn').addEventListener('click', () => {
    if (navigator.geolocation) {
        const geoBtn = document.getElementById('geoBtn');
        geoBtn.innerText = "⌛ PINNING GPS...";
        
        navigator.geolocation.getCurrentPosition((position) => {
            document.getElementById('lat').value = position.coords.latitude;
            document.getElementById('lng').value = position.coords.longitude;
            geoBtn.innerText = "✅ GPS LOCATION PINNED";
            geoBtn.style.background = "#d1fae5";
            geoBtn.style.color = "var(--success)";
        }, () => {
            alert("Location access denied. Please enable GPS.");
            geoBtn.innerText = "📍 Tag GPS Location";
        });
    }
});


document.getElementById('mainBtn').addEventListener('click', async () => {
    const desc = document.getElementById('manualDesc').value;
    const name = document.getElementById('finderName').value;
    const contact = document.getElementById('finderContact').value;

    if (!desc || !name || !contact) {
        return alert("Please provide Item Name, Your Name, and Contact info.");
    }

    const statusEl = document.getElementById('status');
    statusEl.innerText = "⌛ PUBLISHING TO NETWORK...";
    
    const file = document.getElementById('imageInput').files[0];
    const compressedPhoto = file ? await resizeImg(file, 800) : null;

    const collectionName = activeType === 'found' ? "items" : "requests";

    try {
        await db.collection(collectionName).add({
            description: desc,
            category: document.getElementById('itemCat').value,
            location: document.getElementById('manualLoc').value || "Main Campus",
            details: document.getElementById('extraNotes').value,
            photo: compressedPhoto,
            lat: document.getElementById('lat').value || null,
            lng: document.getElementById('lng').value || null,
            userName: name,
            contactInfo: contact,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Refresh to show new post
        location.reload();
    } catch (e) {
        alert("System Error: " + e.message);
    }
});

function loadFeed(collection, elementId) {
    db.collection(collection).orderBy("createdAt", "desc").onSnapshot(snapshot => {
        const container = document.getElementById(elementId);
        container.innerHTML = "";
        
        snapshot.forEach(doc => {
            const item = doc.data();
            
            
            const imageHtml = item.photo 
                ? `<img src="${item.photo}" alt="Item">` 
                : `<div class="no-photo-box"><span>NO PHOTO UPLOADED</span></div>`;

            
            const card = `
                <div class="feed-card hover-lift">
                    <div class="card-image-box">${imageHtml}</div>
                    <div class="card-content">
                        <span style="font-size:10px; font-weight:900; color:var(--accent); text-transform:uppercase;">${item.category}</span>
                        <h3>${item.description}</h3>
                        <p class="loc-text">📍 ${item.location}</p>
                        ${item.details ? `<p style="font-size:12px; color:var(--slate); margin-bottom:12px; font-style:italic;">"${item.details}"</p>` : ''}
                        
                        <div style="background:#f0fdf4; padding:12px; border-radius:16px; font-size:13px; margin-top:auto; border:1px solid #dcfce7;">
                            <strong>Contact:</strong> ${item.userName}<br>
                            <span style="color:var(--accent); font-weight:700;">📞 ${item.contactInfo}</span>
                        </div>

                        <div style="display:flex; gap:10px; margin-top:15px;">
                            ${item.lat ? `<button class="btn" style="flex:1; background:var(--dark); font-size:11px;" onclick="openMap(${item.lat}, ${item.lng})">View Spot on Map</button>` : ''}
                            <button class="btn" style="flex:1; background:#fee2e2; color:var(--danger); font-size:11px;" onclick="resolveItem('${collection}', '${doc.id}')">RESOLVE</button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });
    });
}


function switchTab(type) {
    document.getElementById('foundFeed').style.display = type === 'found' ? 'grid' : 'none';
    document.getElementById('lostFeed').style.display = type === 'lost' ? 'grid' : 'none';
    
    document.getElementById('tabFound').classList.toggle('active', type === 'found');
    document.getElementById('tabLost').classList.toggle('active', type === 'lost');
}

function openMap(lat, lng) {
    
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
}

function resolveItem(col, id) {
    if(confirm("Mark this item as recovered/resolved? It will be permanently removed.")) {
        db.collection(col).doc(id).delete();
    }
}

function filterFeed() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const cards = document.querySelectorAll('.feed-card');
    
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(query) ? "flex" : "none";
    });
}


loadFeed("items", "foundFeed");
loadFeed("requests", "lostFeed");
