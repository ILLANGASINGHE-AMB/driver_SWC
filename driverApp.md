### Web App For Driver ###

### Functional Requirements ###
01. All the Tabs and Popup windows must be auto optimzed for Mobile Screen Sizes
02. All the Tabs and Popup windows must support Landscape or Portrait Screen Orientations
03. Keep the same UI and UI Colors and features with same loging screen with this stucture

    -----------------------------------------------|
    |   ----------------------------------------|  |
    |   |--------|                              |  |
    |   |        |     username |           |   |  |
    |   |Logo    |                              |  |
    |   |        |     password |           |   |  |
    |   |--------|                              |  |
    |                   |log in|                |  |
    |   ----------------------------------------   | 
    |                                              |
    |----------------------------------------------|
    
04. Use React Framework for the UI
05. Use existing Supabase for backend and authentication and database
06. Add a tab as Profile that contains driver details

### How user accounts is created ###

step 01 --> Admin Adds a new driver
step 02 --> driver assigns username and password for specific driver profile
step 03 --> gives username and password for driver
step 04 --> driver logs into system using that username and password
step 05 --> everywhere user needed to select driver, automatically fills with the driver profile that has been logged into the system
step 06 ---> cannot access or change other driver profiles or their data

### Driver Actions ###
01. Start a new trip
02. End a trip
03. Place new Order

### Features of the System ###
01. if driver picks up a vehicle, other drivers should not be able to take that vehicle,
02. all the fucntions must be work as the current driver profile account in the current system

