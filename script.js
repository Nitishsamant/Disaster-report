let map = L.map('map').setView([20.5937, 78.9629], 5); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const DB_NAME = 'disasterDB';
const DB_VERSION = 1;
const STORE_NAME = 'disasters';
let db;

let disasters = [];
let markers = [];

const severityColors = {
    'Low': '#3498db',     
    'Medium': '#f39c12',  
    'High': '#e74c3c',    
    'Critical': '#8e44ad' 
};

const disasterIcons = {
    'Earthquake': '🔄',
    'Flood': '🌊',
    'Fire': '🔥',
    'Cyclone': '🌀',
    'Landslide': '⛰️'
};

document.addEventListener('DOMContentLoaded', function() {
    initDatabase();
    document.getElementById('disasterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitDisaster();
    });
    if (document.getElementById('contactForm')) {
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            showNotification('Message sent successfully!', 'success');
            this.reset();
        });
    }
    document.querySelectorAll('nav a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        });
    });
});

function initDatabase() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            objectStore.createIndex('type', 'type', { unique: false });
            objectStore.createIndex('location', 'location', { unique: false });
            objectStore.createIndex('severity', 'severity', { unique: false });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
    };
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('Database initialized successfully');
        loadDisastersFromDB();
    };
    request.onerror = function(event) {
        console.error('Database error:', event.target.error);
        loadDisasters();
    };
}

function loadDisastersFromDB() {
    if (!db) {
        console.error('Database not initialized');
        loadDisasters();
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();
    request.onsuccess = function(event) {
        disasters = event.target.result;
        disasters.forEach(disaster => {
            addDisasterToTable(disaster);
            addDisasterToMap(disaster);
        });
        updateStatistics();
    };
    request.onerror = function(event) {
        console.error('Error loading disasters from database:', event.target.error);
        loadDisasters();
    };
}

function submitDisaster() {
    const type = document.getElementById('type').value;
    const location = document.getElementById('location').value;
    const severity = document.getElementById('severity').value;
    const description = document.getElementById('description').value;
    if (!type || !location || !severity) {
        showNotification('Please fill out all required fields.', 'error');
        return;
    }
    getCoordinates(location)
        .then(coords => {
            const newDisaster = {
                id: Date.now(),
                type: type,
                location: location,
                severity: severity,
                description: description,
                timestamp: new Date().toLocaleString(),
                coordinates: coords
            };
            disasters.push(newDisaster);
            saveDisasterToDB(newDisaster);
            addDisasterToTable(newDisaster);
            addDisasterToMap(newDisaster);
            document.getElementById('disasterForm').reset();
            updateStatistics();
            showNotification('Disaster report submitted successfully!', 'success');
        })
        .catch(error => {
            console.error('Error getting coordinates:', error);
            showNotification('Error submitting report. Please try again.', 'error');
        });
}

function saveDisasterToDB(disaster) {
    if (!db) {
        console.error('Database not initialized');
        saveDisasters();
        return;
    }
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.add(disaster);
    request.onsuccess = function() {
        console.log('Disaster added to the database with ID:', disaster.id);
    };
    request.onerror = function(event) {
        console.error('Error adding disaster to database:', event.target.error);
        saveDisasters();
    };
}

function getCoordinates(location) {
    return new Promise((resolve) => {
        const cityCoordinates = {
            'delhi': [28.6139, 77.2090],
            'mumbai': [19.0760, 72.8777],
            'kolkata': [22.5726, 88.3639],
            'chennai': [13.0827, 80.2707],
            'bangalore': [12.9716, 77.5946],
            'hyderabad': [17.3850, 78.4867],
            'ahmedabad': [23.0225, 72.5714],
            'pune': [18.5204, 73.8567],
            'jaipur': [26.9124, 75.7873],
            'lucknow': [26.8467, 80.9462]
        };
        const lowercaseLocation = location.toLowerCase();
        for (const city in cityCoordinates) {
            if (lowercaseLocation.includes(city)) {
                const randomOffset = () => (Math.random() - 0.5) * 0.1;
                resolve([
                    cityCoordinates[city][0] + randomOffset(), 
                    cityCoordinates[city][1] + randomOffset()
                ]);
                return;
            }
        }
        const indiaCenter = [20.5937, 78.9629];
        resolve([
            indiaCenter[0] + (Math.random() - 0.5) * 10, 
            indiaCenter[1] + (Math.random() - 0.5) * 15
        ]);
    });
}

function addDisasterToTable(disaster) {
    const table = document.getElementById('reportsTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    const typeCell = newRow.insertCell(0);
    typeCell.innerHTML = disasterIcons[disaster.type] + ' ' + disaster.type;
    const locationCell = newRow.insertCell(1);
    locationCell.textContent = disaster.location;
    const severityCell = newRow.insertCell(2);
    severityCell.textContent = disaster.severity;
    severityCell.style.color = severityColors[disaster.severity];
    severityCell.style.fontWeight = 'bold';
    const descriptionCell = newRow.insertCell(3);
    descriptionCell.textContent = disaster.description;
    newRow.setAttribute('data-id', disaster.id);
    newRow.addEventListener('click', function() {
        showDisasterDetails(disaster);
    });
}

function showDisasterDetails(disaster) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function() {
        document.body.removeChild(modal);
    };
    modalContent.innerHTML = `
        <h2>${disasterIcons[disaster.type]} ${disaster.type} in ${disaster.location}</h2>
        <div class="detail-grid">
            <div>
                <p><strong>Severity:</strong> <span style="color:${severityColors[disaster.severity]}">${disaster.severity}</span></p>
                <p><strong>Reported:</strong> ${disaster.timestamp}</p>
                <p><strong>Description:</strong> ${disaster.description || 'No description provided'}</p>
                <p><strong>Coordinates:</strong> ${disaster.coordinates[0].toFixed(4)}, ${disaster.coordinates[1].toFixed(4)}</p>
            </div>
            <div class="detail-map" id="detail-map"></div>
        </div>
        <div class="action-buttons">
            <button class="action-btn delete-btn" data-id="${disaster.id}">Delete Report</button>
            <button class="action-btn export-btn" data-id="${disaster.id}">Export Report</button>
        </div>
    `;
    modal.appendChild(modalContent);
    modalContent.prepend(closeBtn);
    document.body.appendChild(modal);
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    setTimeout(() => {
        const detailMap = L.map('detail-map').setView(disaster.coordinates, 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(detailMap);
        L.marker(disaster.coordinates).addTo(detailMap)
            .bindPopup(`<strong>${disaster.type}</strong><br>${disaster.location}`);
    }, 300);
    setTimeout(() => {
        document.querySelector('.delete-btn').addEventListener('click', function() {
            const disasterId = parseInt(this.getAttribute('data-id'));
            deleteDisaster(disasterId);
            document.body.removeChild(modal);
        });
        document.querySelector('.export-btn').addEventListener('click', function() {
            const disasterId = parseInt(this.getAttribute('data-id'));
            exportSingleReport(disasterId);
        });
    }, 100);
}

function deleteDisaster(disasterId) {
    if (db) {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.delete(disasterId);
        request.onsuccess = function() {
            console.log('Disaster deleted from database with ID:', disasterId);
        };
        request.onerror = function(event) {
            console.error('Error deleting disaster from database:', event.target.error);
        };
    }
    const index = disasters.findIndex(disaster => disaster.id === disasterId);
    if (index !== -1) {
        disasters.splice(index, 1);
    }
    const markerIndex = markers.findIndex(marker => marker.id === disasterId);
    if (markerIndex !== -1) {
        map.removeLayer(markers[markerIndex].marker);
        markers.splice(markerIndex, 1);
    }
    const row = document.querySelector(`tr[data-id="${disasterId}"]`);
    if (row) {
        row.parentNode.removeChild(row);
    }
    saveDisasters();
    updateStatistics();
    showNotification('Disaster report deleted successfully!', 'success');
}

function exportSingleReport(disasterId) {
    const disaster = disasters.find(d => d.id === disasterId);
    if (!disaster) {
        showNotification('Report not found', 'error');
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Location,Severity,Description,Timestamp,Latitude,Longitude\n";
    const row = [
        disaster.type,
        disaster.location,
        disaster.severity,
        disaster.description.replace(/,/g, ' '),
        disaster.timestamp,
        disaster.coordinates[0],
        disaster.coordinates[1]
    ].join(",");
    csvContent += row + "\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `disaster_report_${disaster.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Report exported successfully!', 'success');
}

function addDisasterToMap(disaster) {
    const marker = L.marker(disaster.coordinates).addTo(map);
    marker.bindPopup(`
        <div class="popup-content">
            <h3>${disasterIcons[disaster.type]} ${disaster.type}</h3>
            <p><strong>Location:</strong> ${disaster.location}</p>
            <p><strong>Severity:</strong> <span style="color:${severityColors[disaster.severity]}">${disaster.severity}</span></p>
            <p><strong>Description:</strong> ${disaster.description || 'No description provided'}</p>
            <p><strong>Reported:</strong> ${disaster.timestamp}</p>
            <button class="view-details-btn" onclick="showDisasterDetails(${JSON.stringify(disaster).replace(/"/g, '&quot;')})">View Details</button>
        </div>
    `);
    markers.push({ id: disaster.id, marker: marker });
}

function saveDisasters() {
    localStorage.setItem('disasters', JSON.stringify(disasters));
}

function loadDisasters() {
    const storedDisasters = localStorage.getItem('disasters');
    if (storedDisasters) {
        disasters = JSON.parse(storedDisasters);
        disasters.forEach(disaster => {
            addDisasterToTable(disaster);
            addDisasterToMap(disaster);
        });
        updateStatistics();
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('filterType')) {
        document.getElementById('filterType').addEventListener('change', filterReports);
        document.getElementById('filterSeverity').addEventListener('change', filterReports);
    }
});

function filterReports() {
    const typeFilter = document.getElementById('filterType').value;
    const severityFilter = document.getElementById('filterSeverity').value;
    const rows = document.getElementById('reportsTable').getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const typeCell = rows[i].getElementsByTagName('td')[0].textContent;
        const severityCell = rows[i].getElementsByTagName('td')[2].textContent;
        let showRow = true;
        if (typeFilter && !typeCell.includes(typeFilter)) {
            showRow = false;
        }
        if (severityFilter && severityCell !== severityFilter) {
            showRow = false;
        }
        rows[i].style.display = showRow ? '' : 'none';
    }
    markers.forEach(markerData => {
        const disaster = disasters.find(d => d.id === markerData.id);
        if (!disaster) return;
        let showMarker = true;
        if (typeFilter && disaster.type !== typeFilter) {
            showMarker = false;
        }
        if (severityFilter && disaster.severity !== severityFilter) {
            showMarker = false;
        }
        if (showMarker) {
            map.addLayer(markerData.marker);
        } else {
            map.removeLayer(markerData.marker);
        }
    });
}

function exportReports() {
    if (disasters.length === 0) {
        showNotification('No reports to export', 'error');
        return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Location,Severity,Description,Timestamp,Latitude,Longitude\n";
    disasters.forEach(disaster => {
        const row = [
            disaster.type,
            disaster.location,
            disaster.severity,
            disaster.description.replace(/,/g, ' '),
            disaster.timestamp,
            disaster.coordinates[0],
            disaster.coordinates[1]
        ].join(",");
        csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "disaster_reports.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Reports exported successfully!', 'success');
}

function getDisastersByType(type) {
    if (!db) {
        return disasters.filter(d => d.type === type);
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const typeIndex = objectStore.index('type');
        const request = typeIndex.getAll(type);
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        request.onerror = function(event) {
            console.error('Error getting disasters by type:', event.target.error);
            resolve(disasters.filter(d => d.type === type));
        };
    });
}

function getDisastersBySeverity(severity) {
    if (!db) {
        return disasters.filter(d => d.severity === severity);
    }
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);
        const severityIndex = objectStore.index('severity');
        const request = severityIndex.getAll(severity);
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
        request.onerror = function(event) {
            console.error('Error getting disasters by severity:', event.target.error);
            resolve(disasters.filter(d => d.severity === severity));
        };
    });
}

function updateStatistics() {
    if (!document.getElementById('totalReports')) return;
    const typeCount = {};
    const severityCount = {};
    disasters.forEach(disaster => {
        typeCount[disaster.type] = (typeCount
[disaster.type] || 0) + 1;
        severityCount[disaster.severity] = (severityCount[disaster.severity] || 0) + 1;
    });
    document.getElementById('totalReports').textContent = disasters.length;
    document.getElementById('earthquakeCount').textContent = typeCount['Earthquake'] || 0;
    document.getElementById('floodCount').textContent = typeCount['Flood'] || 0;
    document.getElementById('fireCount').textContent = typeCount['Fire'] || 0;
    document.getElementById('cycloneCount').textContent = typeCount['Cyclone'] || 0;
    document.getElementById('landslideCount').textContent = typeCount['Landslide'] || 0;
    document.getElementById('lowSeverityCount').textContent = severityCount['Low'] || 0;
    document.getElementById('mediumSeverityCount').textContent = severityCount['Medium'] || 0;
    document.getElementById('highSeverityCount').textContent = severityCount['High'] || 0;
    document.getElementById('criticalSeverityCount').textContent = severityCount['Critical'] || 0;
}
async function fetchGuidelines(disasterType) {
  const response = await fetch(`/api/guidelines?disaster=${disasterType}`);
  const data = await response.json();

  document.getElementById("guidelines").innerHTML = `
    <h3>Government Guidelines</h3>
    <ul>${data.guidelines.map(g => `<li>${g}</li>`).join("")}</ul>

    <h3>Benefits & Relief</h3>
    <ul>${data.benefits.map(b => `<li>${b}</li>`).join("")}</ul>
  `;
}

  const form = document.getElementById("newsForm");
  const newsList = document.getElementById("newsList");

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const title = document.getElementById("newsTitle").value;
    const img = document.getElementById("newsImage").value;
    const content = document.getElementById("newsContent").value;

    // Create a new news item
    const newsItem = document.createElement("div");
    newsItem.classList.add("news-item");
    newsItem.innerHTML = `
      <h3>${title}</h3>
      ${img ? `<img src="${img}" alt="News image">` : ""}
      <p>${content}</p>
    `;

    newsList.prepend(newsItem); // Add new news at top
    form.reset();
  });
