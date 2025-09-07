// Initialize the map
let map = L.map('map').setView([20.5937, 78.9629], 5); // Default center at India

// Add the tile layer (map background)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Database configuration
const DB_NAME = 'disasterDB';
const DB_VERSION = 1;
const STORE_NAME = 'disasters';
let db;

// Store disaster markers and data
let disasters = [];
let markers = [];

// Colors for different severity levels
const severityColors = {
    'Low': '#3498db',     // Blue
    'Medium': '#f39c12',  // Orange
    'High': '#e74c3c',    // Red
    'Critical': '#8e44ad' // Purple
};

// Disaster type icons
const disasterIcons = {
    'Earthquake': '🔄',
    'Flood': '🌊',
    'Fire': '🔥',
    'Cyclone': '🌀',
    'Landslide': '⛰️'
};

// Initialize the form event listener and database
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the database
    initDatabase();
    
    // Event listener for form submission
    document.getElementById('disasterForm').addEventListener('submit', function(e) {
        e.preventDefault();
        submitDisaster();
    });

    // Initialize contact form submission
    if (document.getElementById('contactForm')) {
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            // Simulate form submission
            showNotification('Message sent successfully!', 'success');
            this.reset();
        });
    }

    // Smooth scrolling for navigation links
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

// Initialize IndexedDB
function initDatabase() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // Create object store if DB is being created or upgraded
    request.onupgradeneeded = function(event) {
        db = event.target.result;
        
        // Create an objectStore to hold disaster information
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            
            // Create indexes for faster searching
            objectStore.createIndex('type', 'type', { unique: false });
            objectStore.createIndex('location', 'location', { unique: false });
            objectStore.createIndex('severity', 'severity', { unique: false });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
    };
    
    // Success callback
    request.onsuccess = function(event) {
        db = event.target.result;
        console.log('Database initialized successfully');
        
        // Load disasters from the database
        loadDisastersFromDB();
    };
    
    // Error callback
    request.onerror = function(event) {
        console.error('Database error:', event.target.error);
        // Fallback to localStorage if IndexedDB fails
        loadDisasters();
    };
}

// Function to load disasters from IndexedDB
function loadDisastersFromDB() {
    if (!db) {
        console.error('Database not initialized');
        loadDisasters(); // Fallback to localStorage
        return;
    }
    
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();
    
    request.onsuccess = function(event) {
        disasters = event.target.result;
        
        // Add each disaster to the table and map
        disasters.forEach(disaster => {
            addDisasterToTable(disaster);
            addDisasterToMap(disaster);
        });
        
        // Update statistics
        updateStatistics();
    };
    
    request.onerror = function(event) {
        console.error('Error loading disasters from database:', event.target.error);
        loadDisasters(); // Fallback to localStorage
    };
}

// Function to submit a new disaster report
function submitDisaster() {
    // Get form values
    const type = document.getElementById('type').value;
    const location = document.getElementById('location').value;
    const severity = document.getElementById('severity').value;
    const description = document.getElementById('description').value;
    
    if (!type || !location || !severity) {
        showNotification('Please fill out all required fields.', 'error');
        return;
    }
    
    // Get coordinates for the location
    getCoordinates(location)
        .then(coords => {
            // Create a new disaster object
            const newDisaster = {
                id: Date.now(), // Simple unique ID
                type: type,
                location: location,
                severity: severity,
                description: description,
                timestamp: new Date().toLocaleString(),
                coordinates: coords
            };
            
            // Add to our disasters array
            disasters.push(newDisaster);
            
            // Save to database
            saveDisasterToDB(newDisaster);
            
            // Add to table and map
            addDisasterToTable(newDisaster);
            addDisasterToMap(newDisaster);
            
            // Clear the form
            document.getElementById('disasterForm').reset();
            
            // Update statistics
            updateStatistics();
            
            // Show success message
            showNotification('Disaster report submitted successfully!', 'success');
        })
        .catch(error => {
            console.error('Error getting coordinates:', error);
            showNotification('Error submitting report. Please try again.', 'error');
        });
}

// Function to save a disaster to IndexedDB
function saveDisasterToDB(disaster) {
    if (!db) {
        console.error('Database not initialized');
        saveDisasters(); // Fallback to localStorage
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
        saveDisasters(); // Fallback to localStorage
    };
}

// Function to get coordinates for a location (mock function)
function getCoordinates(location) {
    return new Promise((resolve) => {
        // In a real app, you would use a geocoding API like Google Maps or Nominatim
        // For demo purposes, we'll use random coordinates around India
        // Central coordinates for some major Indian cities:
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
        
        // Check if location matches any city (case insensitive)
        const lowercaseLocation = location.toLowerCase();
        for (const city in cityCoordinates) {
            if (lowercaseLocation.includes(city)) {
                // Add slight randomness to avoid overlapping markers for the same city
                const randomOffset = () => (Math.random() - 0.5) * 0.1;
                resolve([
                    cityCoordinates[city][0] + randomOffset(), 
                    cityCoordinates[city][1] + randomOffset()
                ]);
                return;
            }
        }
        
        // If no match, use a random location in India
        const indiaCenter = [20.5937, 78.9629];
        resolve([
            indiaCenter[0] + (Math.random() - 0.5) * 10, 
            indiaCenter[1] + (Math.random() - 0.5) * 15
        ]);
    });
}

// Function to add a disaster to the table
function addDisasterToTable(disaster) {
    const table = document.getElementById('reportsTable').getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();
    
    // Insert type with icon
    const typeCell = newRow.insertCell(0);
    typeCell.innerHTML = disasterIcons[disaster.type] + ' ' + disaster.type;
    
    // Insert location
    const locationCell = newRow.insertCell(1);
    locationCell.textContent = disaster.location;
    
    // Insert severity with color
    const severityCell = newRow.insertCell(2);
    severityCell.textContent = disaster.severity;
    severityCell.style.color = severityColors[disaster.severity];
    severityCell.style.fontWeight = 'bold';
    
    // Insert description
    const descriptionCell = newRow.insertCell(3);
    descriptionCell.textContent = disaster.description;
    
    // Add data-id attribute for potential future use (editing, deleting)
    newRow.setAttribute('data-id', disaster.id);
    
    // Add row click event for details
    newRow.addEventListener('click', function() {
        showDisasterDetails(disaster);
    });
}

// Function to show disaster details in a modal
function showDisasterDetails(disaster) {
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = function() {
        document.body.removeChild(modal);
    };
    
    // Create content
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
    
    // Add modal to body
    modal.appendChild(modalContent);
    modalContent.prepend(closeBtn);
    document.body.appendChild(modal);
    
    // Show modal with animation
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Initialize detail map
    setTimeout(() => {
        const detailMap = L.map('detail-map').setView(disaster.coordinates, 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(detailMap);
        
        // Add marker
        L.marker(disaster.coordinates).addTo(detailMap)
            .bindPopup(`<strong>${disaster.type}</strong><br>${disaster.location}`);
    }, 300);
    
    // Add event listeners for action buttons
    setTimeout(() => {
        // Delete button
        document.querySelector('.delete-btn').addEventListener('click', function() {
            const disasterId = parseInt(this.getAttribute('data-id'));
            deleteDisaster(disasterId);
            document.body.removeChild(modal);
        });
        
        // Export button
        document.querySelector('.export-btn').addEventListener('click', function() {
            const disasterId = parseInt(this.getAttribute('data-id'));
            exportSingleReport(disasterId);
        });
    }, 100);
}

// Function to delete a disaster
function deleteDisaster(disasterId) {
    // Remove from IndexedDB
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
    
    // Remove from array
    const index = disasters.findIndex(disaster => disaster.id === disasterId);
    if (index !== -1) {
        disasters.splice(index, 1);
    }
    
    // Remove from map
    const markerIndex = markers.findIndex(marker => marker.id === disasterId);
    if (markerIndex !== -1) {
        map.removeLayer(markers[markerIndex].marker);
        markers.splice(markerIndex, 1);
    }
    
    // Remove from table
    const row = document.querySelector(`tr[data-id="${disasterId}"]`);
    if (row) {
        row.parentNode.removeChild(row);
    }
    
    // Update localStorage (fallback)
    saveDisasters();
    
    // Update statistics
    updateStatistics();
    
    // Show notification
    showNotification('Disaster report deleted successfully!', 'success');
}

// Function to export a single report
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
        disaster.description.replace(/,/g, ' '), // Remove commas to avoid CSV issues
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

// Function to add a disaster to the map
function addDisasterToMap(disaster) {
    // Create marker with custom popup
    const marker = L.marker(disaster.coordinates).addTo(map);
    
    // Add custom popup
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
    
    // Store the marker with the disaster ID
    markers.push({ id: disaster.id, marker: marker });
}

// Function to save disasters to localStorage (fallback)
function saveDisasters() {
    localStorage.setItem('disasters', JSON.stringify(disasters));
}

// Function to load disasters from localStorage (fallback)
function loadDisasters() {
    const storedDisasters = localStorage.getItem('disasters');
    if (storedDisasters) {
        disasters = JSON.parse(storedDisasters);
        
        // Add each disaster to the table and map
        disasters.forEach(disaster => {
            addDisasterToTable(disaster);
            addDisasterToMap(disaster);
        });
        
        // Update statistics
        updateStatistics();
    }
}

// Function to show notifications
function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide and remove after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Add filter functionality for the reports
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('filterType')) {
        document.getElementById('filterType').addEventListener('change', filterReports);
        document.getElementById('filterSeverity').addEventListener('change', filterReports);
    }
});

// Function to filter reports
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
    
    // Filter markers on map
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

// Function to export all reports as CSV
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
            disaster.description.replace(/,/g, ' '), // Remove commas to avoid CSV issues
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

// Function to get data for a specific disaster type
function getDisastersByType(type) {
    if (!db) {
        // Fallback to array filtering if IndexedDB is not available
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
            // Fallback to array filtering
            resolve(disasters.filter(d => d.type === type));
        };
    });
}

// Function to get data for a specific severity level
function getDisastersBySeverity(severity) {
    if (!db) {
        // Fallback to array filtering if IndexedDB is not available
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
            // Fallback to array filtering
            resolve(disasters.filter(d => d.severity === severity));
        };
    });
}

// Add statistics dashboard functionality
function updateStatistics() {
    if (!document.getElementById('totalReports')) return;
    
    // Count disasters by type and severity
    const typeCount = {};
    const severityCount = {};
    
    disasters.forEach(disaster => {
        // Count by type
        typeCount[disaster.type] = (typeCount[disaster.type] || 0) + 1;
        
        // Count by severity
        severityCount[disaster.severity] = (severityCount[disaster.severity] || 0) + 1;
    });
    
    // Update UI
    document.getElementById('totalReports').textContent = disasters.length || 0;
    
    // Update type breakdown
    const typeBreakdown = document.getElementById('typeBreakdown');
    typeBreakdown.innerHTML = '';
    
    if (disasters.length === 0) {
        typeBreakdown.innerHTML = '<div>No data available</div>';
    } else {
        for (const type in typeCount) {
            const percentage = (typeCount[type] / disasters.length * 100).toFixed(1);
            typeBreakdown.innerHTML += `<div>${disasterIcons[type] || '🔹'} ${type}: ${typeCount[type]} (${percentage}%)</div>`;
        }
    }
    
    // Update severity breakdown
    const severityBreakdown = document.getElementById('severityBreakdown');
    severityBreakdown.innerHTML = '';
    
    if (disasters.length === 0) {
        severityBreakdown.innerHTML = '<div>No data available</div>';
    } else {
        for (const severity in severityCount) {
            const percentage = (severityCount[severity] / disasters.length * 100).toFixed(1);
            severityBreakdown.innerHTML += 
                `<div style="color:${severityColors[severity]}">
                    ${severity}: ${severityCount[severity]} (${percentage}%)
                </div>`;
        }
    }
}

// Make the showDisasterDetails function globally available
window.showDisasterDetails = showDisasterDetails;
