---
title: supervisor教程
date: 2025-10-09T17:21:50Z
lastmod: 2025-12-17T16:41:53Z
---

# supervisor教程

---

supervisor教程

supervisor是一个统一管理批量化进程的工具，最主要用处是接口或者程序半夜挂了，能够自己重新启动。

官方网址：http://www.supervisord.org/

1. 安装

使用pip和yum都可以安装。

2. 配置管理

supervisor是通过两个配置文件对进程统一管理，格式是ini，注释是前面加分号。

主进程配置文件：/etc/supervisord.conf  就是supervisor本身的配置文件。

子进程配置文件：/etc/supervisord.d/  该文件夹下是supervisor管理的各个进程所属的配置文件。

**2.1 主进程配置文件**

基本不用改，一般是反注释掉[inet\_http\_server]模块，可以通过web界面进行管理。以及配置[include]模块中的路径。

|配置区域|配置信息|解释说明|
| ----------------------------| -------------------------------------------------------------| --------------------------------------------------------------------------------------------------------------------------------------------------------------|
|[unix\_http\_server]|file\=/var/run/supervisor/supervisor.sock|一定要配置对，sockt套接字，该套接字是supervisor客户端和服务端进行连接的桥梁。|
||chmod\=0700|该套接字的权限，表示用户拥有该套接字的读写该权限，组和其他都没有权限。|
||chown\=nobody:nogroup|用户和组设定， 格式:uid:gid|
|[inet\_http\_server]|port\=127.0.0.1:9001|Web管理界面网址|
||username\=user|登录名|
||password\=123|登录密码|
|supervisord|logfile\=/tmp/supervisord.log|supervisor运行的日志文件|
||logfile\_maxbytes\=50MB|日志文件最大，超出会rotate,设置为0，表示不限大小。|
||logfile\_backups\=10|日志文件备份数量，0表示不备份。|
||loglevel\=info|日志级别|
||pidfile\=/tmp/supervisord.pid|supervisor进程号的保存地址。|
||nodaemon\=false|默认后台启动。|
||minfds\=1024|可以打开的文件描述符的最小值，也及时文件的索引最大值。一般就是调用子进程的配置文件数量。|
||minprocs\=200|能管理的进程数量|
|supervisorctl（二选一）|serverutl\=unix:///tmp/supervisor.sock|通过unix socket连接supervisord，路径要和file一样。理解就是能通过服务器的命令行supervisorctl进行管理|
||serverurl\=http://127.0.0.1:9001|在本机管理另一台服务器的supervisor服务，例如通过supervisorctl 10.0.0.1 --http 10.0.0.2 进行管理|
|[program:tomcat]||管理进程的参数 ，格式 program:项目名称，这个区域在子进程文件中替代。|
||command\=/opt/apache-tomcat/bin/catalina.sh run|执行命令|
||autostart\=true|supervisord启动的时候也自动启动|
||startsecs\=10|启动10秒后还是处于正常运行状态，表示该服务已经启动了。有异常就退出|
||autorestart\=true|[unexpected, true, false], unexpected,如果是Kill -9的话，表示是异常结束的，会重新启动。supervisorctl stop 表示正常结束，不重新启动。一般部署服务都是用true。|
||startetries\=3|重启次数。失败三次之后|
||user\=root|默认用户启动|
||priority\=999|启动先后顺序编码，值小的先启动。|
||redirect\_stderr\=true|错误和正常信息都重定向到stdout|
||stdout\_logfile\_maxbytes\=20MB|stdout 日志大小|
||stdout\_logfile\_backups\=20|stdout日志文件备份数量，默认10|
||stdout\_logfile\=/otp.apache-tomcat/logs/catalina.out|stdout日志文件保存路径，需要保证路径存在，不存在手动创建|
|[include]|files\=/etc/supervisord.d/\*.ini|可以不用像[program:xxx]区域一样配置，读取子进程配置文件就可以。|

**2.2 子进程配置文件**

3. 启动和管理supervisor

|命令|作用说明|
| --------------------------------------| ---------------------------------------------------------------------------------------------|
|supervisord -c /etc/supervisord.conf|读取主进程配置文件，并启动|
|systemctl start supervisord.service|编写supervisor.service文件启动supervisor，并加载默认配置文件看，默认是/etc/supervisord.conf|
|systemctl enable supervisord.service|开机就启动|

|命令|作用说明|
| -----------------------------------------------------------------------------------| --------------------------------------------------|
|supervisorctl status|查看所有进程的状态|
|supervisorctl stop all / supervisorctl stop nginx|停止所有进程/停止nginx进程|
|supervisorctl start all / supervisorctl start nginx|启动所有进程/启动nginx进程|
|supervisorctl restart all / supervisorctl restart nginx启动所有进程/启动nginx进程|重新启动所有进程/重新启动nginx进程|
|supervisorctl update|重新加载新的配置文件，并启动新加入的进程。|
|supervisorctl relaod|配置文件修改后，主进程不变，重新启动所有的子进程|

4. 附录

配置systemctl的supervisord.service文件

/home/test/supervisord-start.sh文件

/home/test/supervisord-restart.sh

/home/test/supervisord-stop.sh
