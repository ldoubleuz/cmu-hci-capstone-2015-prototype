# cmu-hci-capstone-2015-prototype
repo for hifi prototype of class project

How to install dependencies:
- From the top-level project directory, run "npm install"

How to run:
- From the top-level project directory, run "mongod --dbpath=db"
- From the top-level project directory, run "node server.js" in another terminal
- In a browser, visit http://localhost:3000/your-url-here. For example, 
   http://localhost:3000/scheduler
- good job you did it

If you get an error about not being to find the googleAPIKeys modules, make sure
you have both the .js file and the .pem key files downloaded from the project
Google Drive under 'Higher Fi Prototype > server keys'. These files should go in
the same root level directory as server.js. (We don't commit these to
the Github repo in order to avoid committing passwords to a public repo.)
