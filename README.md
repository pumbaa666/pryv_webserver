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
|*      INSTALLATION      *|
\*------------------------*/
Close any app running on port 8080 (or modify app_port in config.js to your needs) and
$cd pryv_webserver
$npm install

/*------------------------*\
|*       LAUNCHING        *|
\*------------------------*/
$node http_server.js

/*------------------------*\
|*         USING          *|
\*------------------------*/
These routes are available :

Route				Type	Requested parameter(s)						Auth.	Content-Type		Return							Code OK	Code KO
---------------------------------------------------------------------------------------------------------------------------------------------------
/users				post	{user : username, password}					no		application/json	The created user (or error)		201		400	
/auth/login			post	username, password							no		application/json	Token valid 48h (or error)		200		400	
/resources			get		-											yes		-					Array of resources	200		
/resources			post	{resource : id, fields : [data1, data2, …]}	yes		application/json	The created resource (or error)	201		400	
/resource/edit/:id	put		{resource : fields : [data1, data2, …]}		yes		application/json	The edited resource (or error)	201/204	400
/resource/:id		delete	-											yes		-					The edited resource (or error)	200		400	

/*------------------------*\
|*        TESTING         *|
\*------------------------*/
Close any app running on port 8080 (or modify app_port in config.js to your needs) and
$npm test