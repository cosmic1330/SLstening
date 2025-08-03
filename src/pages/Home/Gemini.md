# src/pages/Home

This directory contains the components for the home page of the application, which is the main view that users see when they open the app.

## Components

- **index.tsx**: This component serves as the layout for the home page. It uses the `Outlet` component from `react-router` to render the nested routes.

- **List.tsx**: This is the main component for the home page. It displays a list of all the stocks that the user is currently tracking. It also includes the `SpeedDial` component for quick access to common actions.

- **Other.tsx**: This component provides a settings page where users can perform actions such as updating the stock list, setting the window to always be on top, and performing a factory reset.

## Subdirectories

- **Twse/**: This directory contains components for displaying information about the Taiwan Stock Exchange Weighted Index (TWSE).
- **Wtx/**: This directory contains components for displaying information about the Taiwan Stock Exchange Futures (WTX).
