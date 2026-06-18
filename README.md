# PulseRoute 🚚

Offline-First Last-Mile Delivery Application built with React Native and Expo.

## Overview

PulseRoute is a cross-platform delivery management application designed for last-mile delivery couriers operating in environments with intermittent or unreliable network connectivity. The application follows an offline-first architecture, ensuring that delivery operations remain functional even when internet access is unavailable.

The system allows couriers to manage deliveries, update delivery statuses, generate and visualize telemetry data, queue offline actions, and automatically synchronize pending operations once connectivity is restored.

---

# Features

## Delivery Dashboard

* View assigned deliveries in a high-performance scrollable list
* Display delivery metadata including:

  * Tracking ID
  * Customer Name
  * Delivery Address
  * Priority Level
  * Delivery Status
* Real-time delivery statistics
* Network connectivity simulation toggle

## Offline-First Workflow

* Manual Online/Offline network simulation
* Local persistence of delivery data
* Offline action queue
* Automatic synchronization when connectivity is restored
* Pending Sync state visualization

## Delivery Detail View

* Tracking information
* Delivery address
* Status information
* Drop-off instructions
* Navigation map placeholder
* Recent telemetry visualization

## Gesture-Based Actions

* Swipe Right → Mark Delivered
* Swipe Left → Mark Failed

## Telemetry Simulation Engine

Simulated telemetry events generated every 500ms:

* Tracking ID
* Timestamp
* Latitude
* Longitude
* Vehicle Speed
* Battery Level
* Network Latency

Telemetry data is displayed in a live activity feed to simulate active vehicle monitoring.

---

# Tech Stack

## Frontend

* React Native
* Expo SDK 54
* TypeScript

## Navigation

* React Navigation
* Native Stack Navigator

## Storage

* AsyncStorage

## Gestures

* React Native Gesture Handler

---

# Installation & Setup

## Prerequisites

Install the following:

* Node.js (18+ recommended)
* npm
* Expo Go (Android/iOS)

---

## Clone Repository

```bash
git clone <repository-url>
cd PulseRoute
```

## Install Dependencies

```bash
npm install
```

## Start Development Server

```bash
npx expo start
```

---

# Running on Android Device

1. Install Expo Go from Google Play Store.
2. Connect the mobile device and development machine to the same network.
3. Start the Expo development server:

```bash
npx expo start
```

4. Scan the QR code using Expo Go.
5. The application will launch on the device.

---

# Running on Android Emulator

```bash
npm run android
```

Android Studio Emulator must be installed and running.

---

# Running on iOS Simulator

```bash
npm run ios
```

Requires macOS with Xcode installed.

---

# Project Structure

```text
PulseRoute
│
├── screens/
│   ├── DashboardScreen.tsx
│   └── DetailScreen.tsx
│
├── storage/
│   ├── storage.ts
│
├── App.tsx
├── package.json
└── README.md
```

---

# Design Decisions Document

## 1. Offline-First Architecture

### Problem

Delivery personnel frequently operate in areas with poor or unavailable connectivity, making immediate server communication unreliable.

### Solution

PulseRoute follows a local-first architecture.

All user actions are immediately committed locally before any server synchronization is attempted.

This guarantees:

* Instant UI responsiveness
* No data loss during connectivity interruptions
* Consistent user experience regardless of network availability

---

## 2. Local Storage Engine Selection

### Selected Solution

AsyncStorage

### Reasoning

The assessment required a local persistence layer capable of storing delivery state and synchronization queues.

AsyncStorage was selected because:

* Lightweight integration with Expo Go
* Persistent storage across application restarts
* Simple implementation for rapid prototyping
* Suitable for the assessment-scale dataset

### Future Improvements

For larger production workloads, AsyncStorage could be replaced by:

* MMKV
* SQLite
* WatermelonDB

without significant changes to the application architecture.

---

## 3. State Management Architecture

### Selected Solution

React Hooks

* useState
* useEffect

### Reasoning

The application contains a relatively small and well-defined state surface:

* Delivery list
* Sync queue
* Connectivity status
* Telemetry feed

React Hooks provided sufficient state management capabilities while minimizing architectural complexity.

This approach reduces:

* Boilerplate code
* Learning overhead
* Unnecessary global state

---

## 4. Synchronization Queue Design

When the application is Offline:

1. User actions are applied immediately.
2. Changes are persisted locally.
3. Mutations are added to a synchronization queue.
4. UI displays a Pending Sync status.

When connectivity returns:

1. Queue processing begins automatically.
2. Pending mutations are synchronized.
3. Status indicators are updated.
4. Queue entries are removed.

This simulates a real-world offline synchronization workflow used by delivery and field-service applications.

---

## 5. Telemetry Simulation Engine

The assessment required continuous telemetry generation.

A background interval generates telemetry events every 500ms.

Each event contains:

```json
{
  "tracking_id": "PR-1004",
  "timestamp": 1781647412,
  "telemetry": {
    "latitude": 8.5253,
    "longitude": 76.9367,
    "speed_kmh": 28
  },
  "device_metrics": {
    "battery_level": 88,
    "network_latency_ms": 44
  }
}
```

Generated events are visualized through a live telemetry feed.

---

## 6. Performance Optimization Strategy

### FlatList Virtualization

FlatList was selected to ensure efficient rendering of delivery records while minimizing unnecessary re-renders.

### Controlled Telemetry History

Only a limited number of telemetry events are retained and displayed.

Benefits:

* Reduced memory usage
* Stable rendering performance
* Predictable UI responsiveness

### Interval Cleanup

Telemetry intervals are properly disposed during component unmounting.

This prevents:

* Memory leaks
* Duplicate generators
* Background execution overhead

---

## 7. UI Thread Optimization

The telemetry engine continuously generates events every 500ms.

To maintain smooth UI interactions:

* Lightweight payload generation is used
* Telemetry history size is constrained
* FlatList virtualization minimizes rendering cost
* State updates are isolated to affected components

This ensures the interface remains responsive during continuous telemetry ingestion.

---

# Known Limitations

* Navigation map is represented using a placeholder component.
* Synchronization targets a simulated backend rather than a live server.
* Telemetry data is simulated and does not represent real GPS hardware.

---

# Future Enhancements

* Real backend integration
* Background location tracking
* Push notifications
* MMKV or SQLite migration
* Real-time maps integration
* Authentication and courier profiles

---



