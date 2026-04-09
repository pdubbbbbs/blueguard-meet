# BlueGuard Meet - Project TODO

## Database & Schema
- [x] Create meetings table with id, roomId (varchar 36 unique), title, hostName, hostUserId (nullable), isActive (default true), maxParticipants (default 10), createdAt, endedAt (nullable)
- [x] Generate and apply migration SQL

## Backend - tRPC Routes
- [x] Create meeting (generate roomId, store in DB, return roomId)
- [x] Get meeting by roomId (public procedure)
- [x] End meeting (set isActive=false, endedAt=now)
- [x] Join meeting validation (check if active, not full)

## Backend - Socket.IO Signaling Server
- [x] Mount Socket.IO at /api/socket.io path
- [x] Handle join-room event (track participants per room)
- [x] Handle WebRTC signaling: offer, answer, ice-candidate
- [x] Handle chat messages relay
- [x] Handle participant disconnect/leave
- [x] Handle host controls: end-meeting, remove-participant
- [x] Enforce max 10 participants per room

## Frontend - Theme & Styling
- [x] Dark premium CSS variables (background #060b18, card #0a1128, primary #3b82f6, etc.)
- [x] Inter font via Google Fonts CDN
- [x] Glow utility classes: .glow-border, .glow-button, .glow-text
- [x] .video-tile class with rounded corners, navy bg, blue border glow on hover
- [x] .bg-grid class with subtle blue grid lines
- [x] ThemeProvider set to dark mode

## Frontend - Pages
- [x] Home page: landing with create meeting + join meeting flows
- [x] Lobby page (/lobby/:roomId): display name input, camera/mic preview, join button
- [x] MeetingRoom page (/meeting/:roomId): full call UI with grid, chat, controls
- [x] JoinRedirect (/join/:roomId): redirects to /lobby/:roomId
- [x] NotFound page styled with dark theme

## Frontend - Meeting Features
- [x] Participant grid view showing all video feeds with name labels
- [x] In-call controls: mute/unmute mic, enable/disable camera, leave meeting
- [x] Host controls: end meeting for all, remove participant
- [x] In-call text chat panel
- [x] Video tiles with .video-tile CSS class

## Responsive & PWA
- [x] Responsive mobile-friendly layout (iOS Safari compatible)
- [x] PWA manifest.json for add-to-home-screen

## Testing
- [x] Write vitest tests for meeting tRPC routes
- [x] Verify Socket.IO signaling works

## TURN Server Configuration
- [x] Add TURN_SERVER_URL, TURN_SERVER_USERNAME, TURN_SERVER_CREDENTIAL env vars via webdev_request_secrets
- [x] Create tRPC endpoint to serve ICE server configuration to clients
- [x] Update useWebRTC hook to fetch and use ICE servers (STUN + TURN) for peer connections
- [x] Include free Google STUN servers as default fallback
- [x] Add TURN server settings section in a settings/admin page
- [x] Write vitest tests for ICE server configuration endpoint
- [x] Verify WebRTC connections use the configured ICE servers
