document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("activity-search");

  // Cache of the last fetched activities, used for client-side search filtering
  let allActivities = {};

  // Render activity cards for the given activities object
  function renderActivities(activities) {
    activitiesList.innerHTML = "";

    const entries = Object.entries(activities);
    if (entries.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your search.</p>";
      return;
    }

    entries.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<ul class="participants-list">${details.participants
              .map(
                (email) => `
              <li>
                <span class="participant-email">${email}</span>
                <button class="delete-participant" data-activity="${name}" data-email="${email}" title="Unregister ${email}" aria-label="Unregister ${email}">&times;</button>
              </li>`
              )
              .join("")}</ul>`
          : `<p class="no-participants">No participants yet</p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-section">
          <h5>Participants</h5>
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;

      // Reset the select dropdown, keeping only the placeholder option
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate the select dropdown with every activity
      Object.keys(activities).forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      renderActivities(activities);
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Show a temporary status message under the signup form
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Handle unregistering a participant via the delete icon (event delegation)
  activitiesList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".delete-participant");
    if (!deleteButton) return;

    const { activity, email } = deleteButton.dataset;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    }
  });

  // Filter the cached activities to those whose name starts with the typed letters
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      renderActivities(allActivities);
      return;
    }

    const filteredActivities = Object.fromEntries(
      Object.entries(allActivities).filter(([name]) => name.toLowerCase().startsWith(query))
    );

    renderActivities(filteredActivities);
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
