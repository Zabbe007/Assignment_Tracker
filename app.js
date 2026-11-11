/* ============================================================
   ASSIGNMENT TRACKER — app.js
   ============================================================

   This file handles all the interactivity on the page:
     - Storing assignments in an array
     - Adding, editing, deleting assignments
     - Marking assignments as complete / in-progress
     - Filtering and sorting the list
     - Updating the dashboard counts

   NOTE ON STORAGE:
   Right now data is stored in the browser's localStorage.
   This means it saves between page refreshes but is NOT
   a real database. See server.py + database.py to connect
   this app to a real SQLite database using Python/Flask.
   ============================================================ */


// === LOAD DATA ===
// Try to load saved assignments from localStorage.
// If nothing is saved yet, start with an empty array.
var assignments = JSON.parse(localStorage.getItem('assignments') || '[]');

// Tracks which filter button is active ("All", "In Progress", "Completed")
var currentFilter = 'All';


// === SAVE DATA ===
// Call this every time assignments change to keep localStorage up to date.
function saveData() {
  localStorage.setItem('assignments', JSON.stringify(assignments));
}


// === MAKE A UNIQUE ID ===
// Each assignment needs a unique ID so we can find it later.
// This just creates a random string like "a3f2b9c1".
function makeId() {
  return Math.random().toString(36).slice(2, 10);
}


// === FORMAT A DATE STRING ===
// Turns "2026-05-20" into "May 20, 2026" for display.
function formatDate(dateStr) {
  var parts = dateStr.split('-');
  var d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}


// === PREVENT XSS ===
// When we insert user-typed text into the page HTML, we must
// escape special characters so a user cannot inject HTML/scripts.
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// === ADD ASSIGNMENT ===
// Called when the Add Assignment form is submitted.
// "event" is passed in so we can call event.preventDefault()
// which stops the page from reloading on form submit.
function addAssignment(event) {
  event.preventDefault();

  // Read values from the form fields
  var title    = document.getElementById('input-title').value.trim();
  var course   = document.getElementById('input-course').value.trim();
  var desc     = document.getElementById('input-desc').value.trim();
  var due      = document.getElementById('input-due').value;
  var priority = document.getElementById('input-priority').value;

  // Basic validation — the required fields are already enforced by
  // the HTML "required" attribute, but this is a second safety check.
  if (!title || !course || !due) {
    alert('Please fill in the Title, Course, and Due Date fields.');
    return;
  }

  // Build the new assignment object
  var newAssignment = {
    id: makeId(),
    title: title,
    course: course,
    desc: desc,
    due: due,
    priority: priority,
    status: 'In Progress'   // All new assignments start as In Progress
  };

  // Add it to our array and save
  assignments.push(newAssignment);
  saveData();

  // Clear the form so it's ready for the next entry
  document.getElementById('assignment-form').reset();

  // Rebuild the list so the new card appears
  renderList();
}


// === DELETE ASSIGNMENT ===
// Removes an assignment by its ID.
function deleteAssignment(id) {
  if (!confirm('Are you sure you want to delete this assignment?')) return;

  // Filter out the assignment with this ID
  assignments = assignments.filter(function(a) { return a.id !== id; });
  saveData();
  renderList();
}


// === TOGGLE STATUS ===
// Clicking the checkbox switches between "In Progress" and "Completed".
function toggleStatus(id) {
  var assignment = assignments.find(function(a) { return a.id === id; });
  if (!assignment) return;

  // Flip the status
  if (assignment.status === 'Completed') {
    assignment.status = 'In Progress';
  } else {
    assignment.status = 'Completed';
  }

  saveData();
  renderList();
}


// === OPEN EDIT MODAL ===
// Fills the edit form with the current values, then shows the modal.
function openEditModal(id) {
  var assignment = assignments.find(function(a) { return a.id === id; });
  if (!assignment) return;

  // Put current values into the edit form fields
  document.getElementById('edit-id').value = assignment.id;
  document.getElementById('edit-title').value = assignment.title;
  document.getElementById('edit-course').value = assignment.course;
  document.getElementById('edit-desc').value = assignment.desc || '';
  document.getElementById('edit-due').value = assignment.due;
  document.getElementById('edit-priority').value = assignment.priority;

  // Show the modal
  document.getElementById('edit-modal').style.display = 'flex';
}


// === SAVE EDIT ===
// Reads the edit form and updates the assignment in the array.
function saveEdit() {
  var id = document.getElementById('edit-id').value;
  var assignment = assignments.find(function(a) { return a.id === id; });
  if (!assignment) return;

  var title  = document.getElementById('edit-title').value.trim();
  var course = document.getElementById('edit-course').value.trim();
  var due    = document.getElementById('edit-due').value;

  if (!title || !course || !due) {
    alert('Please fill in the Title, Course, and Due Date fields.');
    return;
  }

  // Update the fields
  assignment.title = title;
  assignment.course = course;
  assignment.desc = document.getElementById('edit-desc').value.trim();
  assignment.due = due;
  assignment.priority = document.getElementById('edit-priority').value;

  saveData();
  closeModal();
  renderList();
}


// === CLOSE MODAL ===
function closeModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

// Also close the modal if the user clicks the dark backdrop behind it
document.getElementById('edit-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});


// === SET FILTER ===
// Called when a filter button is clicked.
function setFilter(filter) {
  currentFilter = filter;

  // Update which filter button looks active
  var buttons = document.querySelectorAll('.filter-btn');
  buttons.forEach(function(btn) {
    // If the button's text matches the chosen filter, add "active" class
    btn.classList.toggle('active', btn.textContent === filter);
  });

  renderList();
}


// === RENDER LIST ===
// Rebuilds the assignment card list from scratch.
// Called whenever the data or filter changes.
function renderList() {
  var listEl = document.getElementById('assignment-list');
  var sortBy = document.getElementById('sort-select').value;
  var today = new Date();
  today.setHours(0, 0, 0, 0); // set to midnight so date comparisons are by day only

  // 1. Filter assignments based on the active filter button
  var filtered = assignments.filter(function(a) {
    if (currentFilter === 'All') return true;
    if (currentFilter === 'In Progress') return a.status === 'In Progress';
    if (currentFilter === 'Completed') return a.status === 'Completed';
    return true;
  });

  // 2. Sort the filtered list
  filtered = filtered.slice().sort(function(a, b) {
    if (sortBy === 'due') {
      return new Date(a.due) - new Date(b.due);  // earliest due date first
    }
    if (sortBy === 'priority') {
      var order = { 'High': 0, 'Medium': 1, 'Low': 2 };
      return order[a.priority] - order[b.priority];  // High first
    }
    if (sortBy === 'course') {
      return a.course.localeCompare(b.course);  // alphabetical
    }
    return 0;
  });

  // 3. If nothing to show, display a message
  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="empty-message">No assignments to show. Add one above!</div>';
    updateDashboard(today);
    return;
  }

  // 4. Build HTML for each assignment card
  var html = '';

  filtered.forEach(function(a) {
    var isCompleted = a.status === 'Completed';
    var dueDate = new Date(a.due + 'T00:00:00');
    var daysLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    // Work out the due date label and urgency style
    var dueText = 'Due: ' + formatDate(a.due);
    var dueCls  = 'due-label';

    if (!isCompleted) {
      if (daysLeft < 0)  { dueText = 'Overdue (' + Math.abs(daysLeft) + 'd ago)'; dueCls += ' overdue'; }
      else if (daysLeft === 0) { dueText = 'Due today!'; dueCls += ' soon'; }
      else if (daysLeft <= 3)  { dueText = 'Due in ' + daysLeft + ' day(s)'; dueCls += ' soon'; }
    }

    // Build the card HTML
    html += '<div class="card priority-' + a.priority + (isCompleted ? ' completed' : '') + '">';

    // Checkbox button
    html += '<div class="card-check ' + (isCompleted ? 'checked' : '') + '" ';
    html += 'onclick="toggleStatus(\'' + a.id + '\')" title="Toggle complete">';
    if (isCompleted) html += '&#10003;'; // checkmark ✓
    html += '</div>';

    // Card text content
    html += '<div class="card-body">';
    html += '<div class="card-title">' + escapeHtml(a.title) + '</div>';
    html += '<div class="card-course">' + escapeHtml(a.course) + '</div>';
    if (a.desc) {
      html += '<div class="card-desc">' + escapeHtml(a.desc) + '</div>';
    }
    html += '<div class="card-meta">';
    html += '<span class="badge ' + a.priority + '">' + a.priority + '</span>';
    html += '<span class="badge ' + (isCompleted ? 'Completed' : 'InProgress') + '">' + a.status + '</span>';
    html += '<span class="' + dueCls + '">' + dueText + '</span>';
    html += '</div>';
    html += '</div>'; // end card-body

    // Edit and Delete buttons
    html += '<div class="card-actions">';
    html += '<button class="btn-small" onclick="openEditModal(\'' + a.id + '\')">Edit</button>';
    html += '<button class="btn-small btn-delete" onclick="deleteAssignment(\'' + a.id + '\')">Delete</button>';
    html += '</div>';

    html += '</div>'; // end card
  });

  listEl.innerHTML = html;

  // 5. Update the dashboard counts at the top
  updateDashboard(today);
}


// === UPDATE DASHBOARD ===
// Updates the four stat boxes at the top of the page.
function updateDashboard(today) {
  var total = assignments.length;
  var completed = assignments.filter(function(a) { return a.status === 'Completed'; }).length;
  var inProgress = total - completed;
  var overdue = assignments.filter(function(a) {
    return a.status !== 'Completed' && new Date(a.due + 'T00:00:00') < today;
  }).length;

  document.getElementById('count-total').textContent = total;
  document.getElementById('count-inprogress').textContent = inProgress;
  document.getElementById('count-completed').textContent = completed;
  document.getElementById('count-overdue').textContent = overdue;
}


// === START --> ===
// Run renderList() once when the page first loads.
renderList();