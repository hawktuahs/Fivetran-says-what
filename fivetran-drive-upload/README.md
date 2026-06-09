# SurgePilot Fivetran Google Drive Upload Pack

Upload this folder to Google Drive, then give Fivetran the Google Drive folder URL.

Recommended Fivetran setup:

- Sync strategy: Merge Mode
- Destination schema: surgepilot_ops
- Table group name: matchday
- File type: CSV
- Base folder URL: the Google Drive folder URL for this folder
- Error handling: fail

Suggested table mappings:

- inventory -> inventory.*\.csv
- sales -> sales.*\.csv
- staffing -> staffing.*\.csv
- suppliers -> suppliers.*\.csv
- promotions -> promotions.*\.csv

