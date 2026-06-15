The full URL is simply
<https://autotest.sapphire-solutions.co.uk{path}>.

|Path|Verb |Sample body (_gets)|
|----|----|----|
|/logincheck.php |POST| username=<>&password=<> (filled from the login dialog)|
|/translationlist.php| POST |sitename=<>|
|/entryselect.php |POST| sitename=<>|
|/locationselect.php |POST| sitename=<>|
|/checkruns.php |POST| entryid=<>|
|/runsleft.php |POST |entryid=<>|
|/eventlist.php?sitename=| GET |– (query string added automatically)|
|/email.php |POST| to=<> subject=<> body=<>|
|/testselect.php |POST| entryid=<>|
|/startedonly.php| POST| entryid=<>|
|/testfinish.php |POST| <form‑data for finishing a test>|
|/testadd.php| POST |<form‑data for adding a test> – contains all test fields|
|/testupdate.php| POST |entryid=<> <other test fields>|
|/listruns.php| POST| entryid=<>|
|/removerun.php| POST| entryid=<>|
|/penaltyupdate.php |POST| entryid=<> penalty=<>|
|/teststart.php |POST |entryid=<>|

Some examples of the form‑body strings

logincheck.php
username=john.doe&password=secret

entryselect.php
sitename=Example%20Track

checkruns.php
entryid=123

testupdate.php (partial)
entryid=123&
number=1&
run=45&
starttime=2026-06-15+12%3A00&
finishtime=2026-06-15+12%3A06&
seconds=360&
cones=10&
lines=5&
extras=none&
options=auto&
wt=incl&datetime=2026-06-15
penaltyupdate.php
entryid=123&penalty=5

The above table includes every distinct endpoint that is constructed in
the frm*classes.  Every request is a POST except:
GET – used only for downloading image data (httpjob._download);
you’ll find the call in a handful of image‑loading code paths
inside httpjob._getbitmap/* helpers.

Summary
Base URL <https://autotest.sapphire-solutions.co.uk>
19 distinct endpoints (see table)
18 of them use POST with form data; 1 endpoint(s) use GET for
image download
All bodies are simple key/value pairs, URL‑encoded and concatenated
with &.  No JSON or multipart payloads are sent.
