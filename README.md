/*------------------------*\
|*     Prerequisites      *|
\*------------------------*/
A MongoDB database installed locally
and runing on port 27017
(or modify db_url and db_port in config.js to your needs)

/*------------------------*\
|*        Download        *|
\*------------------------*/
$git clone https://github.com/pumbaa666/pryv_webserver.git

/*------------------------*\
|* Installation & running *|
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
|*        TESTING         *|
\*------------------------*/
Close any app running on port 8080 (or modify app_port in config.js to your needs) and
$npm test