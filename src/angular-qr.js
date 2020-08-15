(function(QRCode){
  'use strict';

  angular.module('ja.qr', [])
  .controller('QrCtrl', ['$scope', function($scope){
    $scope.getTypeNumber = function(){
      return $scope.typeNumber || 0;
    };

    $scope.getCorrection = function(){
      var levels = {
        'L': 1,
        'M': 0,
        'Q': 3,
        'H': 2
      };

      var correctionLevel = $scope.correctionLevel || 0;
      return levels[correctionLevel] || 0;
    };

    $scope.getText = function(){
      return $scope.text || '';
    };

    $scope.getSize = function(){
      return $scope.size || 250;
    };

    $scope.isNUMBER = function(text){
      var allowedChars = /^[0-9]*$/;
      return allowedChars.test(text);
    };

    $scope.isALPHA_NUM = function(text){
      var allowedChars = /^[0-9A-Z $%*+\-./:]*$/;
      return allowedChars.test(text);
    };

    $scope.is8bit = function(text){
      for (var i = 0; i < text.length; i++) {
        var code = text.charCodeAt(i);
        if (code > 255) {
          return false;
        }
      }
      return true;
    };

    $scope.checkInputMode = function(inputMode, text){
      if (inputMode === 'NUMBER' && !$scope.isNUMBER(text)) {
        throw new Error('The `NUMBER` input mode is invalid for text.');
      }
      else if (inputMode === 'ALPHA_NUM' && !$scope.isALPHA_NUM(text)) {
        throw new Error('The `ALPHA_NUM` input mode is invalid for text.');
      }
      else if (inputMode === '8bit' && !$scope.is8bit(text)) {
        throw new Error('The `8bit` input mode is invalid for text.');
      }
      else if (!$scope.is8bit(text)) {
        throw new Error('Input mode is invalid for text.');
      }

      return true;
    };

    $scope.getInputMode = function(text){
      var inputMode = $scope.inputMode;
      inputMode = inputMode || ($scope.isNUMBER(text) ? 'NUMBER' : undefined);
      inputMode = inputMode || ($scope.isALPHA_NUM(text) ? 'ALPHA_NUM' : undefined);
      inputMode = inputMode || ($scope.is8bit(text) ? '8bit' : '');

      return $scope.checkInputMode(inputMode, text) ? inputMode : '';
    };
  }])
  .directive('qr', ['$timeout', '$window', function($timeout, $window){

    // noinspection JSUnusedLocalSymbols
    return {
      restrict: 'E',
      template: '<canvas ng-hide="image"></canvas><img alt="QR" ng-if="image" ng-src="{{canvasImage}}"/>',
      scope: {
        typeNumber: '=',
        correctionLevel: '=',
        inputMode: '=',
        size: '=',
        text: '=',
        image: '='
      },
      controller: 'QrCtrl',
      link: function postlink(scope, element, attrs){

        if (scope.text === undefined) {
          throw new Error('The `text` attribute is required.');
        }

        var canvas = element.find('canvas')[0];
        // noinspection JSUnresolvedVariable
        var canvas2D = !!$window.CanvasRenderingContext2D;

        scope.TYPE_NUMBER = scope.getTypeNumber();
        scope.TEXT = scope.getText();
        scope.CORRECTION = scope.getCorrection();
        scope.SIZE = scope.getSize();
        scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
        scope.canvasImage = '';

        var drawShiftedSquare = function(c, x, y, w, d) {
          c.beginPath();
          c.moveTo(x+d,y);
          c.lineTo(x+w,y+d);
          c.lineTo(x+w-d,y+w);
          c.lineTo(x,y+w-d);
          c.lineTo(x+d,y);
          c.fill();
        };

        var drawCircle = function(c, x, y, w, r) {
          var w2 = w/2;
          c.beginPath();
          c.ellipse(x+w2,y+w2, r, r, 0, 0, Math.PI*2);
          c.fill();
        };

        var drawStar = function (c, cx, cy, spikes, outerRadius, innerRadius){
          var rot=Math.PI/2*3;
          var x=cx;
          var y=cy;
          var step=Math.PI/spikes;

          c.beginPath();
          c.moveTo(cx,cy-outerRadius);
          for(var i=0; i<spikes; i++){
            x=cx+Math.cos(rot)*outerRadius;
            y=cy+Math.sin(rot)*outerRadius;
            c.lineTo(x,y);
            rot+=step;

            x=cx+Math.cos(rot)*innerRadius;
            y=cy+Math.sin(rot)*innerRadius;
            c.lineTo(x,y);
            rot+=step;
          }
          c.lineTo(cx,cy-outerRadius);
          c.closePath();
          // c.stroke();
          c.fill();
        };

        var drawShapeFunc = {
          square: function(c, x, y, w) {
            c.fillRect(x, y, w, w);
          },
          squareSmall: function(c, x, y, w) {
            var d = w*0.1, d2 = d*2;
            c.fillRect(x+d, y+d, w-d2, w-d2);
          },
          circle: function(c, x, y, w) {
            drawCircle(c, x, y, w, w/2);
          },
          circleBig: function(c, x, y, w) {
            drawCircle(c, x, y, w, w*0.55);
          },
          circleSmall: function(c, x, y, w) {
            drawCircle(c, x, y, w, w*0.4);
          },
          dot: function(c, x, y, w) {
            drawCircle(c, x, y, w, w*0.3);
          },
          diamond: function(c, x, y, w) {
            drawShiftedSquare(c, x, y, w, w/2);
          },
          mosaic: function(c, x, y, w) {
            drawShiftedSquare(c, x, y, w, Math.random()*w/2);
          },
          star: function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 5, r, r/2);
          },
          star4: function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 4, r, r/3);
          },
          star6: function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 6, r, r/2);
          },
          snowflake: function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 6, r, r/5);
          },
          star8: function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 8, r*1.2, r/3);
          }
        };

        var gradientFunc = {
          diagonal:     function(c,w) {  return c.createLinearGradient(0,0, w, w);  },
          diagonalLeft: function(c,w) {  return c.createLinearGradient(w,0, 0, w);  },
          horizontal:   function(c,w) {  return c.createLinearGradient(0,0, w, 0);  },
          vertical:     function(c,w) {  return c.createLinearGradient(0,0, 0, w);  },
          radial:       function(c,w) {
            var r=w/2;
            return c.createRadialGradient(r,r, r, r, r,0);
          },
          radialInverse:function(c,w) {
            var r=w/2;
            return c.createRadialGradient(r,r, 0, r, r,r);
          }
        };

        var draw = function(context, qr, modules, tile){
          var design = {
            bodyShape:'circle',
            gradient:'radialInverse', // diagonal, diagonalLeft, horizontal, vertical, radial, radialInverse
            //MAYBE Fill pattern https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern
            color:      '#f00',
            colorMiddle:'#00f',
            colorFinish:'#0a0'
            //TODO Eye Frame Shape, color
            //TODO Eye Ball Shape, color
            //TODO Logo image
            //TODO Border
          };

          var width  = modules*tile;

          var isEye = function(row,col) {

          };

          // fill style & gradient
          var bodyFillStyle = design.color || '#000';
          if (design.gradient) {
            bodyFillStyle = gradientFunc[design.gradient](context, width);
            bodyFillStyle.addColorStop(0, design.color || '#000');
            if (design.colorMiddle) bodyFillStyle.addColorStop(0.5, design.colorMiddle);
            if (design.colorFinish) bodyFillStyle.addColorStop(1.0, design.colorFinish);
          }

          var bodyDrawShape = drawShapeFunc[design.bodyShape];

          for (var row = 0; row < modules; row++) {
            for (var col = 0; col < modules; col++) {
              var x = Math.round(col * tile),
                  y = Math.round(row * tile);
              var w = (Math.ceil((col + 1) * tile) - Math.floor(col * tile)),
                  h = (Math.ceil((row + 1) * tile) - Math.floor(row * tile));

              if (qr.isDark(row, col)) {
                context.fillStyle = bodyFillStyle;
                bodyDrawShape(context, x, y, w);
              } else {
                // context.fillStyle =  '#fff';
                // context.fillRect(x, y, w, h);
              }
            }
          }
        };

        var render = function(canvas, value, typeNumber, correction, size, inputMode){
          var trim = /^\s+|\s+$/g;
          var text = value.replace(trim, '');

          var qr = new QRCode(typeNumber, correction, inputMode);
          qr.addData(text);
          qr.make();

          var context = canvas.getContext('2d');

          var modules = qr.getModuleCount();
          var tile = size / modules;
          canvas.width = canvas.height = size;

          if (canvas2D) {
            draw(context, qr, modules, tile);
            scope.canvasImage = canvas.toDataURL() || '';
          }
        };

        render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);

        $timeout(function(){
          scope.$watch('text', function(value, old){
            if (value !== old) {
              scope.TEXT = scope.getText();
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('correctionLevel', function(value, old){
            if (value !== old) {
              scope.CORRECTION = scope.getCorrection();
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('typeNumber', function(value, old){
            if (value !== old) {
              scope.TYPE_NUMBER = scope.getTypeNumber();
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('size', function(value, old){
            if (value !== old) {
              scope.SIZE = scope.getSize();
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });

          scope.$watch('inputMode', function(value, old){
            if (value !== old) {
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE);
            }
          });
        });

      }
    };
  }]);

})(window.QRCode);
