/*------------------------*\
|*     PREREQUISITES      *|
\*------------------------*/
A MongoDB database installed locally
and runing on port 27017
(or modify db_url and db_port in config.js to your needs)

/*------------------------*\
|*        DOWNLOAD        *|
\*------------------------*/
$git clone https://github.com/pumbaa666/pryv_webserver.git

/*------------------------*\
|* INSTALLATION & RUNNING *|
\*------------------------*/
Close any app running on port 8080 (or modify app_port in config.js to your needs) and
$cd pryv_webserver
$npm install
$node http_server.js

/*------------------------*\
|*       LAUNCHING        *|
\*------------------------*/
Launch your favorite browser and open http://localhost:8080/
alernatively you can see a working version on http://www.pumbaa.ch:8080/
(or modify app_port in config.js to your needs)

/*------------------------*\
|*         USING          *|
\*------------------------*/
Start by creating a new user, providing a username and a password
Then login using the same credentials.
Once logged, navigate to the resources page.
Create a resource. You have to provide at least one field.
Edit the resource by changing the field provided before.
Then delete the resource by clicking the "✘".
Finally you can logout.

/*------------------------*\
|*        TESTING         *|
\*------------------------*/
Close any app running on port 8080 (or modify app_port in config.js to your needs) and
$npm test