<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Portfolio Gallery</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Wix App SDK — required for widget to render inside Wix editor -->
  <script src="https://static.parastorage.com/services/js-sdk/1.388.0/app-sdk.js"></script>

  <script src="./pro-filter-gallery.js" defer></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
      background: transparent;
      overflow-x: hidden;
    }

    body {
      font-family: Inter, Arial, sans-serif;
    }

    pro-filter-gallery {
      display: block;
      width: 100%;
    }
  </style>
</head>
<body>
  <pro-filter-gallery></pro-filter-gallery>

  <script>
    // Wait for Wix SDK to be ready
    window.onload = function () {

      // Listen for settings changes from the settings panel
      Wix.addEventListener(Wix.Events.SETTINGS_UPDATED, function (message) {
        const gallery = document.querySelector('pro-filter-gallery');
        if (gallery && message) {
          // Pass any settings updates down to your web component
          // e.g. gallery.setAttribute('theme', message.theme);
          console.log('Settings updated:', message);
        }
      });

      // Tell Wix the widget is ready and report its height
      Wix.reportAppLoaded();

      // Auto-resize the iframe to match content height
      function reportHeight() {
        Wix.setHeight(document.body.scrollHeight);
      }
      reportHeight();

      // Re-report height if content changes (e.g. modal opens)
      const observer = new ResizeObserver(reportHeight);
      observer.observe(document.body);
    };
  </script>
</body>
</html>
