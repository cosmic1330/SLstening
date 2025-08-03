# src/components

This directory contains reusable React components that are used throughout the application.

## Top-Level Components

- **ArrowDown.tsx** and **ArrowUp.tsx**: Simple components that display down and up arrows, respectively, using Material-UI's `ForwardRoundedIcon` with a rotation.

- **InsertRuleButton.tsx**: A button that opens a dialog to allow users to insert a new "rule" by pasting a JSON string. The component validates the JSON and adds the new rule to the application's state using the `useSchoiceStore` hook.

- **LanguageSwitcher.tsx**: A button that switches the application's language between English and Traditional Chinese using the `react-i18next` library.

- **SpeedDial.tsx**: A Material-UI Speed Dial component that provides quick access to common actions, such as:
    - Adding a new stock
    - Copying the current stock list to the clipboard
    - Clearing all tracked stocks
    - Opening the stock selection window
    - Navigating to the settings page
    - Logging out

- **Version.tsx**: A component that displays the application's version number, which it retrieves using Tauri's `getVersion` API. It also includes the `LanguageSwitcher` component.

## Subdirectories

This directory also contains several subdirectories for more complex components:

- **RechartCustoms/**: Custom components for the Recharts library.
- **ResultTable/**: Components for displaying data in a table format.
- **StockBox/**: Components for displaying information about a single stock.
