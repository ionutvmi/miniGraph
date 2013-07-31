// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;(function ( $, window, document, undefined ) {

	// Create the defaults once
	var pluginName = "miniGraph",
		defaults = {
			width : 600,
			height : 400,
			bg_color : '#eee',
			textSize : 15,
			textColor: '#000'
		};
		defaults_line = {
			gridColor : '#ccc',
			baizerCurve : true,
			showLabels : true,
			showGrid : true,
			showDots : true
		};
		defaults_bar = {
			gridColor : '#ccc',
			barSpacing : 5,
			showLabels : true,
			showGrid : true
		};
		defaults_pie = {
			showStroke : true,
			showLabels : true,			
			strokeWidth : 3,
			strokeColor : '#fff'
		};

	// The actual plugin constructor
	function Plugin( element, style, data, options ) {
		this.element = element;
		// we compare the options based on the style of the graph
		if(style == 'bar')
			this.options = $.extend( {}, defaults, defaults_bar, options );
		else if(style == 'pie')
			this.options = $.extend( {}, defaults, defaults_pie, options );
		else
			this.options = $.extend( {}, defaults, defaults_line, options );

		this.style = style;
		this._data = data;
		this._name = pluginName;
		
		this.rotateAng = 0; // the rotation angle of the labels
		this.widestLabel = 0; // the widest label
		
		this.init();
	}

	Plugin.prototype = {

		init: function() {
			$elem = $(this.element);
			if( !$elem.is('canvas') ) { // if the current element is not a canvas we add it
				$elem.append("<canvas></canvas>");
				this.element = $elem.children("canvas");
				// from now on this.element will be the canvas
			}

			// we grab the context
			if(!(this.ctx = $(this.element)[0].getContext('2d')))
				throw new Error("There was a problem with the canvas element.");
			
			this.topOffset = 6; // we move the the labels/grind/values a bit lower so we can see them

			// setting the width and height
			this.ctx.canvas.width = this.options.width;
			this.ctx.canvas.height = this.options.height;
			
			// set the background color
			this.ctx.fillStyle = this.options.bg_color;


			// based on the style we draw the graph
			if(this.style == 'bar') {
				// set the left and bottom padding for labels and values
				this.xPadding = this.options.width - this.getDrawWidth(this.ctx, this._data) + 5;//+padding
				this.yPadding = this.options.height - this.getDrawHeight(this.ctx, this._data);

				// we make the main drawing area
				this.ctx.fillRect(this.xPadding, 0,this.options.width, this.options.height-this.yPadding);
				
				if(this.options.showLabels)
					this.drawLabels(this.ctx, this._data);
				
				if(this.options.showGrid)
					this.drawGrid(this.ctx, this._data);
				
				this.drawBars(this.ctx, this._data, this.options);
				

			} else if(this.style == 'pie') {
				// we make the main drawing area
				this.ctx.fillRect(0, 0,this.options.width, this.options.height);
				
				if(this.options.showLabels)
					this.drawPieLabels(this.ctx, this._data); // must be called before drawPie()

				this.drawPie(this.ctx, this._data)

			} else {
				// set the left and bottom padding for labels and values
				this.xPadding = this.options.width - this.getDrawWidth(this.ctx, this._data) + 5;//+padding
				this.yPadding = this.options.height - this.getDrawHeight(this.ctx, this._data);

				// we make the main drawing area
				this.ctx.fillRect(this.xPadding, 0,this.options.width, this.options.height-this.yPadding);
				if(this.options.showLabels)
					this.drawLabels(this.ctx, this._data);
	
				if(this.options.showGrid)
					this.drawGrid(this.ctx, this._data);
				
				this.drawLines(this.ctx, this._data, this.options);
	
				if(this.options.showDots)
					this.drawDots(this.ctx, this._data);
			}

		},

		drawPie : function(ctx, data) {

			width = this.options.width;
			height = this.options.height;
			
			if(this.options.showLabels)
				width -= this.widestLabel;



			var segmentTotal = 0;
			for (var i=0; i<data.length; i++){
				segmentTotal += data[i].value;
			}	

			//In case we have a canvas that is not a square. Minus 5 pixels as padding round the edge.
			var pieRadius = this.Min([height/2,width/2]) - 5;

			var cumulativeAngle = -Math.PI/2;


			for (var i=0; i < data.length; i++){

				ctx.save();

				var segmentAngle =  ((data[i].value/segmentTotal) * (Math.PI*2));


				ctx.beginPath();
				ctx.arc(width/2,height/2, pieRadius,cumulativeAngle, cumulativeAngle + segmentAngle);

				ctx.lineTo(width/2,height/2);
				ctx.closePath();

				ctx.fillStyle = data[i].color;
				ctx.fill();

				ctx.restore();


				if(this.options.showStroke){
					ctx.lineel_Width = this.options.strokeWidth;
					ctx.strokeStyle = this.options.strokeColor;
					ctx.stroke();
				}
				
				percent = Math.round((data[i].value/segmentTotal)*100);
				ang = cumulativeAngle + segmentAngle/2;
				ctx.fillStyle = this.options.textColor;
				ctx.fillText(percent + '%', width/2 + Math.cos(ang) * pieRadius/2, height/2 + Math.sin(ang)*pieRadius/2);



				cumulativeAngle += segmentAngle;
			}
		},
		// draw the bars
		drawBars : function(ctx, data) {

			ctx.moveTo(0,0);
			height = this.getDrawHeight(ctx, data);
			width = this.getDrawWidth(ctx, data);

			barSpacing = this.options.barSpacing;
			valueHop = Math.floor(width/(data.labels.length));
			barWidth = (valueHop  - (barSpacing*2) - (data.datasets.length-1) - (data.datasets.length-1))/data.datasets.length;

			for(var i = 0; i < data.datasets.length; i++) {
				for(var j = 0; j < data.datasets[i].data.length; j++) {

					// if we have multiple bars we divide the bar spacing by 2 to make 
					// the difference between labels more obvious 
					if(j == data.datasets[i].data.length -1)
						spp = 1;
					else
						spp = 0.5;

					ctx.beginPath();
					xPos = this.xPos(j) + (barWidth + barSpacing * spp) * i;
					yPos = this.yPos(i,j);

					ctx.moveTo(xPos, height);
					
					ctx.lineTo(xPos, yPos);

					ctx.lineTo(xPos + barWidth, yPos);
					
					ctx.lineTo(xPos + barWidth, height);

					ctx.closePath();

					ctx.fillStyle = data.datasets[i].fillColor;
					ctx.fill();
					ctx.strokeStyle = data.datasets[i].strokeColor;
					ctx.stroke();
				}
			}
		},

		// draw labels for pie 
		drawPieLabels : function(ctx, data) {
			ctx.font = this.options.textSize + "px Arial";
			max = 1;

			for(var i = 0; i < data.length; i++) {
				// we grab the size
				testSize = ctx.measureText(data[i].name).width;
				if(testSize > max)
					max = testSize;				
			}

			this.widestLabel = max + this.options.textSize*2; // the size of the text + some padding and width of the small rectangle

			for(i = 0; i < data.length; i++) {
				yPos = (i+1) * this.options.textSize + 5;
				xPos = this.options.width - this.widestLabel;
				
				ctx.fillStyle = this.options.textColor;
				ctx.fillText(data[i].name, xPos + this.options.textSize + 2, yPos + 2);

				ctx.beginPath();
				ctx.rect(xPos, yPos - this.options.textSize + 4, this.options.textSize/1.1, this.options.textSize/1.1);
				ctx.fillStyle = data[i].color;
      			ctx.fill();
				ctx.lineel_Width = this.options.strokeWidth; 
				ctx.strokeStyle = this.options.strokeColor;
      			ctx.stroke();
      			ctx.restore();
			}

		},
		// draw the labels for bar and lines
		drawLabels : function(ctx, data) {


			ctx.font = this.options.textSize + "px Arial";
			ctx.fillStyle = this.options.textColor;



			// the xLabels
			valueHop = Math.floor((this.getDrawWidth(ctx, data) - this.widestLabel*2 - 20)/(data.labels.length-1));	
			for(var i = 0; i < data.labels.length; i++) {
				ctx.save();
				
				if(this.rotateAng > 0) {
					ctx.translate(this.xPos(i), this.options.height - 5);
					ctx.rotate(-(this.rotateAng * (Math.PI/180)));
					ctx.fillText(data.labels[i], 0, 0);
					ctx.restore();
				} else
					ctx.fillText(data.labels[i], this.xPos(i), this.options.height - 5);
			
				ctx.restore();
			}


			// the yLabels
			calc = this.calculateScale(ctx, data);

			scaleHop = this.getDrawHeight(ctx,data)/calc.steps;
			for (var i = 0, j = calc.steps; i < calc.steps; i++, j--) {
				val = (calc.graphMin + (calc.stepValue * j)).toFixed(this.getDecimalPlaces(calc.stepValue));
				ctx.fillText(val, 3, scaleHop*(i+1) - this.options.textSize/2 + this.topOffset/2);
			}
			
		},
		// draw the lines graph
		drawLines: function(ctx, data, opt) {
			ctx.beginPath();

			ctx.moveTo(0,0);
			for(var i = 0; i < data.datasets.length; i++) {
				for(var j = 0; j < data.datasets[i].data.length; j++) {

					if(j == 0)
						ctx.moveTo(this.xPos(j, 1), this.yPos(i,j));
					else 
						if(this.options.baizerCurve)
							ctx.bezierCurveTo(this.xPos(j-0.5,1), this.yPos(i,j-1), this.xPos(j-0.5,1), this.yPos(i,j), this.xPos(j,1), this.yPos(i,j));
						else
							ctx.lineTo(this.xPos(j, 1), this.yPos(i,j));
					
					
				}
					ctx.strokeStyle = data.datasets[i].strokeColor;
					ctx.stroke();
			}

		},

		drawGrid : function(ctx, data) {
			
			// the vertical lines
			valueHop = Math.floor((this.getDrawWidth(ctx, data) - this.widestLabel*2 - 20)/(data.labels.length-1));	
			ctx.strokeStyle = this.options.gridColor;
			
			for(var i = 0; i < data.labels.length; i++) {

				ctx.beginPath();
				xPos = this.xPos(i,1);
				yPos = this.options.height - this.yPadding;
				ctx.moveTo(xPos, yPos);
				ctx.lineTo(xPos, 0)
				ctx.stroke();

			}


			// the horizontal lines
			calc = this.calculateScale(ctx, data);

			scaleHop = this.getDrawHeight(ctx, data)/calc.steps;

			for (var i = 0, j = calc.steps; i < calc.steps; i++, j--) {

				ctx.beginPath();
				ctx.moveTo(this.xPadding, scaleHop*(i+1) - this.options.textSize + this.topOffset - this.options.textSize/2.5);
				ctx.lineTo(this.options.width, scaleHop*(i+1) - this.options.textSize + this.topOffset - this.options.textSize/2.5);
				ctx.stroke();				
			}			
			ctx.restore();
		},

		drawDots : function(ctx,data) {
			ctx.save();
			for(var i = 0; i < data.datasets.length; i++)
				for(var j = 0; j < data.datasets[i].data.length; j++) {
					ctx.beginPath();
					ctx.arc(this.xPos(j, 1), this.yPos(i,j), 3, 0, 2 * Math.PI, true);
					ctx.closePath();
					ctx.fillStyle = data.datasets[i].pointColor;
					ctx.fill();
				}
			ctx.restore();
		},

		// get the max draw width
		getDrawWidth : function(ctx, data) {
			var max = 1;
			ctx.font = this.options.textSize + "px Arial";
			for(var i = 0; i < data.datasets.length; i++){

				for(var j = 0; j < data.datasets[i].data.length; j++) {

					testSize = ctx.measureText(data.datasets[i].data[j]).width;

					if(testSize > max)
						max = testSize;
				}
			}


			return this.options.width - max - 5;
		},

		// get the max draw height
		getDrawHeight : function(ctx, data) {

			
			var maxWidth = 1,
				maxHeight = this.options.height,
				rotateAng = 0;
			ctx.font = this.options.textSize + "px Arial"; 

			// get the max value
			for(var i = 0; i < data.labels.length; i++){
				testSize = ctx.measureText(data.labels[i]).width;
				if(testSize > maxWidth)
					maxWidth = testSize;
			}

			maxWidth += 15; // some padding

			// figure out if we need to rotate the text
			if(this.options.width/data.labels.length < maxWidth) {
				rotateAng = 45;
				if(this.options.width/data.labels.length < Math.cos(rotateAng) * maxWidth) {
					rotateAng = 90;
					maxHeight -= maxWidth + 5;
				} else
					maxHeight -= Math.sin(rotateAng) * maxWidth + 5;
			} else
				maxHeight -= parseInt(this.options.textSize) + 5; // enough to fit the text

			this.widestLabel = maxWidth;
			this.rotateAng = rotateAng; // we save the rotation angle

			return maxHeight;
		},		


		//Max value from array
		Max : function( array ) {
			return Math.max.apply( Math, array );
		},

		//Min value from array
		Min : function( array ) {
			return Math.min.apply( Math, array );
		},

		calculateOrderOfMagnitude : function(val) {
			return Math.floor(Math.log(val) / Math.LN10);
		},
		getDecimalPlaces : function(num){
			var numberOfDecimalPlaces;
			if (num%1!=0){
				return num.toString().split(".")[1].length
			}
			else{
				return 0;
			}

		},


		calculateOffset : function(val,calculatedScale,scaleHop){
			var outerValue = calculatedScale.steps * calculatedScale.stepValue;
			var adjustedValue = val - calculatedScale.graphMin;
			var scalingFactor = this.CapValue(adjustedValue/outerValue,1,0);
			var result = (scaleHop*calculatedScale.steps) * scalingFactor;
			return result < this.topOffset ? this.topOffset + 7 : result;
		},

		CapValue : function(valueToCap, maxValue, minValue){
			if(this.isNumber(maxValue)) {
				if( valueToCap > maxValue ) {
					return maxValue;
				}
			}
			if(this.isNumber(minValue)){
				if ( valueToCap < minValue ){
					return minValue;
				}
			}
			return valueToCap;
		},
		isNumber : function(n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		},
		calculateScale : function(ctx, data) {
						
			minVal = data.datasets[0].data[0]; // set the initial value as the first value in datasets
			for(i = 0; i < data.datasets.length; i++) {
				min = this.Min(data.datasets[i].data);
				if(min < minVal)
					minVal = min;
			}
			maxVal = data.datasets[0].data[0]; // set the initial value as the first value in datasets
			for(i = 0; i < data.datasets.length; i++) {
				max = this.Max(data.datasets[i].data);
				if(max > maxVal)
					maxVal = max;
			}


			scaleHeight = this.getDrawHeight(ctx, data);
			var maxSteps = Math.floor((scaleHeight / (this.options.textSize*0.66)));
			var minSteps = Math.floor((scaleHeight / this.options.textSize*0.5));

			rangeOrderOfMagnitude = this.calculateOrderOfMagnitude(maxVal - minVal);

			graphMin = Math.floor(minVal / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude);

			graphMax = Math.ceil(maxVal / (1 * Math.pow(10, rangeOrderOfMagnitude))) * Math.pow(10, rangeOrderOfMagnitude);

			graphRange = graphMax - graphMin;

			stepValue = Math.pow(10, rangeOrderOfMagnitude);

			numberOfSteps = Math.round(graphRange / stepValue);
			
			
			//Compare number of steps to the max and min for that size graph, and add in half steps if need be.
			while((numberOfSteps < minSteps || numberOfSteps > maxSteps)) {
				//console.log(numberOfSteps + " - " + minSteps + " - " + maxSteps);
				if (numberOfSteps < minSteps){
					stepValue /= 2;
					numberOfSteps = Math.round(graphRange/stepValue);
				}
				else{
					stepValue *= 2;
					numberOfSteps = Math.round(graphRange/stepValue);
				}
			}

			return {
				steps : numberOfSteps,
				stepValue : stepValue,
				graphMin : graphMin
			};

		},
		xPos : function(iteration, hasOffset){
			valueHop = Math.floor((this.getDrawWidth(this.ctx, this._data) - this.widestLabel*2 - 20)/(this._data.labels.length-1));	
			
			if(hasOffset)
				offset = valueHop/3;
			else
				offset = valueHop/4;
			
			return this.yPadding + (valueHop * iteration) + offset;
		},
		yPos : function(dataSet,iteration){
			calc = this.calculateScale(this.ctx, this._data);
			scaleHop = this.getDrawHeight(this.ctx, this._data)/calc.steps;
			return this.getDrawHeight(this.ctx, this._data) - this.calculateOffset(this._data.datasets[dataSet].data[iteration], this.calculateScale(this.ctx, this._data), scaleHop) + this.topOffset;
		}

	};

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function ( style, data, options ) {
		return this.each(function () {
			if (!$.data(this, "plugin_" + pluginName)) {
				$.data(this, "plugin_" + pluginName, new Plugin( this, style, data, options ));
			}
		});
	};

})( jQuery, window, document );


