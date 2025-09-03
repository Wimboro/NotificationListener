# 🎨 UI Editing Guide for Notification Listener

This guide will help you edit the UI components in Android Studio easily using the Jetpack Compose previews.

## 📁 Project Structure

```
ui/
├── MainActivity.kt                     # App entry point
├── screens/
│   └── NotificationListenerScreen.kt  # Main screen with previews
├── components/                         # Individual UI components (all with previews)
│   ├── SettingsForm.kt
│   ├── PermissionStatusCard.kt
│   ├── LogsSection.kt
│   └── DebugUtilities.kt
├── theme/                             # App styling
│   ├── Color.kt
│   ├── Theme.kt
│   └── Type.kt
├── viewmodel/                         # State management
└── state/                            # UI state definitions
```

## 🔍 Using Android Studio Compose Previews

### **1. Enable Compose Preview Panel**
1. Open any UI component file (e.g., `SettingsForm.kt`)
2. In Android Studio, go to **View** → **Tool Windows** → **Split**
3. You should see the preview panel on the right side
4. If not visible, click the **Split** icon in the top-right of the editor

### **2. Available Previews**

#### **Main Screen (`NotificationListenerScreen.kt`)**
- `NotificationListenerScreenPreviewGranted` - Permission granted state
- `NotificationListenerScreenPreviewDenied` - Permission denied state  
- `NotificationListenerScreenPreviewDark` - Dark theme

#### **Settings Form (`SettingsForm.kt`)**
- `SettingsFormPreviewEmpty` - Empty form
- `SettingsFormPreviewFilled` - Form with data
- `SettingsFormPreviewLoading` - Loading state
- `SettingsFormPreviewErrors` - With validation errors

#### **Permission Card (`PermissionStatusCard.kt`)**
- `PermissionStatusCardPreviewGranted` - Permission granted
- `PermissionStatusCardPreviewDenied` - Permission denied
- `PermissionStatusCardPreviewGrantedDark` - Dark theme

#### **Logs Section (`LogsSection.kt`)**
- `LogsSectionPreviewEmpty` - No logs
- `LogsSectionPreviewWithLogs` - With sample logs
- `LogItemPreviewSuccess` - Success log item
- `LogItemPreviewError` - Error log item

#### **Debug Utilities (`DebugUtilities.kt`)**
- `DebugUtilitiesPreview` - Light theme
- `DebugUtilitiesPreviewDark` - Dark theme

### **3. Interactive Preview Features**
- **Real-time Updates**: Changes to code appear instantly in preview
- **Multiple Previews**: See different states side-by-side
- **Theme Testing**: Light/dark mode variants
- **Device Preview**: Test on different screen sizes

## 🎨 Common UI Editing Tasks

### **1. Change Colors**

Edit `ui/theme/Color.kt`:
```kotlin
val Purple40 = Color(0xFF6650a4)     // Change this hex value
val PurpleGrey40 = Color(0xFF625b71)
val Pink40 = Color(0xFF7D5260)
```

### **2. Modify Typography**

Edit `ui/theme/Type.kt`:
```kotlin
val Typography = Typography(
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,          // Change font size
        lineHeight = 24.sp,
        letterSpacing = 0.5.sp
    )
)
```

### **3. Update Component Layout**

Example - Add spacing in `SettingsForm.kt`:
```kotlin
Column(
    modifier = Modifier.padding(16.dp),           // Add more padding
    verticalArrangement = Arrangement.spacedBy(20.dp)  // Increase spacing
) {
    // Content
}
```

### **4. Modify Button Styles**

```kotlin
Button(
    onClick = { /* action */ },
    colors = ButtonDefaults.buttonColors(
        containerColor = MaterialTheme.colorScheme.secondary  // Change color
    ),
    shape = RoundedCornerShape(12.dp)                        // Change shape
) {
    Text("Button Text")
}
```

### **5. Add New UI Elements**

1. Create a new `@Composable` function
2. Add it to the appropriate screen/component
3. Create a `@Preview` function to see it immediately

Example:
```kotlin
@Composable
fun MyNewWidget() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Text(
            text = "New Content",
            modifier = Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyLarge
        )
    }
}

@Preview(showBackground = true)
@Composable
fun MyNewWidgetPreview() {
    NotificationListenerTheme {
        MyNewWidget()
    }
}
```

## 🛠️ Editing Workflow

### **Step 1: Choose Your Component**
1. Navigate to the component you want to edit
2. Look at the available previews in the preview panel

### **Step 2: Make Changes**
1. Edit the Compose code
2. See changes instantly in the preview
3. Test different states using multiple previews

### **Step 3: Test Interactivity**
1. Use the interactive preview mode
2. Click on interactive elements
3. Test with different preview variants (light/dark theme)

### **Step 4: Build and Test**
1. Build the project: `Ctrl+F9` (Windows/Linux) or `Cmd+F9` (Mac)
2. Run on device/emulator to test real behavior

## 🎯 Quick Tips

### **Performance**
- Previews update automatically when you save
- Use `@Preview` parameters for different configurations:
  ```kotlin
  @Preview(showBackground = true, name = "Light Theme")
  @Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES, name = "Dark Theme")
  ```

### **Layout Debugging**
- Add background colors temporarily to see component boundaries:
  ```kotlin
  modifier = Modifier.background(Color.Red.copy(alpha = 0.3f))
  ```

### **State Testing**
- Use preview functions to test different UI states
- Mock data is provided in preview functions for realistic testing

### **Theme Customization**
- All previews use `NotificationListenerTheme`
- Changes to theme files affect all previews automatically
- Test both light and dark themes

## 📱 Material Design Resources

- **Material 3 Guidelines**: https://m3.material.io/
- **Compose Documentation**: https://developer.android.com/jetpack/compose
- **Color Tool**: https://m3.material.io/theme-builder

## 🔧 Troubleshooting

### **Preview Not Showing**
1. Check if the file contains `@Preview` annotations
2. Make sure `import androidx.compose.ui.tooling.preview.Preview` is imported
3. Sync project: **File** → **Sync Project with Gradle Files**

### **Build Errors**
1. Clean project: **Build** → **Clean Project**
2. Rebuild: **Build** → **Rebuild Project**
3. Check import statements

### **Theme Not Applied**
1. Ensure components are wrapped in `NotificationListenerTheme`
2. Check theme definitions in `ui/theme/` directory

---

Now you can easily edit your UI components with real-time visual feedback! 🎉