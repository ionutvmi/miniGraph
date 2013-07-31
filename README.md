MiniGraph Plugin
========================
Really simple graph plugin with some basic features.  

How to use
------------
```javascript
var data = {
	'labels' : ['Jan', 'Feb', 'Mar','Apr', 'May', 'Jun', 'Jul'],
	'datasets' : [
		{
			strokeColor : "rgba(220,220,220,1)",
			pointColor : "#000",
			data : [65,59,90,81,56,55,40]
		},
		{
			strokeColor : "rgba(151,187,205,1)",
			pointColor : "#00ff00",
			data : [20,48,40,12,96,27,110]
		}
	]
};
options = {
	bg_color: '#eee'
};
$('.line').miniGraph("line", data, options);
```

Available Graphs:

* line
* bar
* pie

Demo
------------
You can find a demo in the html file.
