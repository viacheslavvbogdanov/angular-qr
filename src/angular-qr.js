(function(QRCode){
  'use strict';

  angular.module('ja.qr', [])
  .controller('QrCtrl', ['$scope', function($scope){
    $scope.getTypeNumber = function(){
      return $scope.typeNumber || 0;
    };

    $scope.getCorrection = function(){
      var levels = {
        'L' :  1,
        'M' :  0,
        'Q' :  3,
        'H' :  2
      };

      var correctionLevel = $scope.correctionLevel || 0;
      return levels[correctionLevel] || 0;
    };

    $scope.getText = function(){
      return $scope.text || '';
    };

    $scope.getDesign = function(){
      return $scope.design || {};
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
      inputMode = inputMode || ($scope.isNUMBER(text) ? 'NUMBER'  :  undefined);
      inputMode = inputMode || ($scope.isALPHA_NUM(text) ? 'ALPHA_NUM'  :  undefined);
      inputMode = inputMode || ($scope.is8bit(text) ? '8bit'  :  '');

      return $scope.checkInputMode(inputMode, text) ? inputMode  :  '';
    };

    $scope.getDesign = function(){
      return $scope.design || {};
    };
  }])
  .directive('qr', ['$timeout', '$window', function($timeout, $window){

    // noinspection JSUnusedLocalSymbols
    return {
      restrict :  'E',
      template :  '<canvas ng-hide="image"></canvas><img alt="QR" ng-if="image" ng-src="{{canvasImage}}"/>',
      scope :  {
        typeNumber :  '=',
        correctionLevel :  '=',
        inputMode :  '=',
        size :  '=',
        text :  '=',
        image :  '=',
        design: '='
      },
      controller :  'QrCtrl',
      link :  function postlink(scope, element, attrs){

        if (scope.text === undefined) {
          throw new Error('The "text" attribute is required.');
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
        /** design */
        var defaultDesign = {
          // bodyShape :  square, squareSmall, circle, circleBig, circleSmall,
          // dot, diamond, mosaic, star, star4, star6, star8, snowflake
          //
          // connected bodyShape: zebra, zebraVertical, zebraThin, zebraThinVertical,
          // star6Vertical, star6Horizontal, pcbVertical, pcbHorizontal, circleWideLinked
          // diamondLinked, diamondWideLinked, pcbLinked, mosaicLinked, circleLinked
          // squareSmallLinked, mosaicThinLinked, circleThinLinked, pcbThinLinked, diamondThinLinked,
          // squareSmallThinLinked, star8ThinLinked, star4ThinLinked
          //
          bodyShape : 'square',
          // Gradient :  diagonal, diagonalLeft, horizontal, vertical, radial, radialInverse
          // gradient : null,
          //MAYBE Fill pattern https : //developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern
          color :       '#000000',
          colorMiddle : '#000000',
          colorFinish : '#000000',
          // Eyes
          // square, circle, octa, round, leaf, petal,
          eyeFrameShape :  'square',
          eyeFrameColor :  '#000000',//'#858A8F',
          eyeBallShape :  'square',
          eyeBallColor :  '#000000',
          //Logo image
          logoImageElementId :  'logoImage',
          logoImageScale :  0.5,
          removeBackgroundBehindLogo :  true //TODO
          //TODO Border
          //TODO BG color
        };
        if (!scope['design'])
          scope.design = defaultDesign;
        else
          for (var a in defaultDesign) { scope[a] = defaultDesign[a]; }

        // scope.bodyShape = '';
        // scope.color = '#000000';
        // scope.colorMiddle = '#000000';


        var drawShiftedSquare = function(c, x, y, w, h, d) {
          c.beginPath();
          c.moveTo(x+d,y);
          c.lineTo(x+w,y+d);
          c.lineTo(x+w-d,y+h);
          c.lineTo(x,y+h-d);
          c.lineTo(x+d,y);
          c.fill();
        };

        var drawCircle = function(c, x, y, w, h, r) {
          var w2 = w/2, h2 = h/2;
          c.beginPath();
          c.ellipse(x+w2,y+h2, w*r, h*r, 0, 0, Math.PI*2);
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

        var drawLinkedHorizontally = function(c, x, y, w, h, qr, row, col, linkSize, shape) {
          var r = h*linkSize, w2 = w/2, p = h/2 - r/2;
          var lDark = qr.isDark(row,col-1),
              rDark = qr.isDark(row,col+1);
          var drawShape = drawShapeFunc[shape] || drawShapeFunc.circle;

          if ((!lDark||!rDark)) drawShape(c, x, y, w, h);

          if (lDark&&rDark) c.fillRect(x, y+p, w, r);
          else {
            if (lDark) c.fillRect(x, y + p, w2, r);
            if (rDark) c.fillRect(x + w2, y + p, w2, r);
          }
        };

        var drawLinkedVertically = function(c, x, y, w, h, qr, row, col, linkSize, shape) {
          var r = w*linkSize, h2 = h/2, p = w/2 - r/2;
          var uDark = qr.isDark(row-1,col),
              dDark = qr.isDark(row+1,col);
          var drawShape = drawShapeFunc[shape] || drawShapeFunc.circle;

          if ((!uDark||!dDark)) drawShape(c, x, y, w, h);

          if (uDark&&dDark) c.fillRect(x+p, y, r, h);
          else {
            if (uDark) c.fillRect(x+p, y, r, h2);
            if (dDark) c.fillRect(x+p, y+h2, r, h2);
          }
        };

        var lookAround = function(qr, row, col) {
          return {
            l :  qr.isDark(row,col-1), // left
            r :  qr.isDark(row,col+1), // right
            u :  qr.isDark(row-1,col), // up
            d :  qr.isDark(row+1,col)  // down
          };
        };
        
        var drawLinked = function(c, x, y, w, h, qr, row, col, linkSize, shape) {
          var w2 = w/2, h2 = h/2, rw = w*linkSize, rh = h*linkSize, pw = w2 - rw/2, ph = h2 - rh/2;
          var near = lookAround(qr, row, col);
          var drawShape = drawShapeFunc[shape] || drawShapeFunc.circle;

          var connections = Number(near.l)+Number(near.r)+Number(near.u)+Number(near.d);

          if (connections<2 || !(connections>=2 && ((near.l&&near.r)||(near.u&&near.d)) ))
            drawShape(c, x, y, w, h);

          if (near.l) c.fillRect(x, y+ph, w2, rh);
          if (near.r) c.fillRect(x + w2, y+ph , w2, rh);
          if (near.u) c.fillRect(x+pw, y, rw, h2);
          if (near.d) c.fillRect(x+pw, y+h2, rw, h2);
        };

        var drawShapeFunc = {
          square :  function(c, x, y, w, h) {
            c.fillRect(x, y, w, h);
          },
          squareSmall :  function(c, x, y, w, h) {
            var dx = w*0.1, dx2 = dx*2;
            var dy = h*0.1, dy2 = dy*2;
            c.fillRect(x+dx, y+dy, w-dx2, h-dy2);
          },
          circle :  function(c, x, y, w, h) {
            drawCircle(c, x, y, w, h,0.5);
          },
          circleBig :  function(c, x, y, w, h) {
            drawCircle(c, x, y, w, h,0.55);
          },
          circleSmall :  function(c, x, y, w, h) {
            drawCircle(c, x, y, w, h, 0.4);
          },
          dot :  function(c, x, y, w, h) {
            drawCircle(c, x, y, w, h, 0.3);
          },
          diamond :  function(c, x, y, w, h) {
            drawShiftedSquare(c, x, y, w, h, w/2);
          },
          mosaic :  function(c, x, y, w, h) {
            drawShiftedSquare(c, x, y, w, h, Math.random()*w/2);
          },
          star :  function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 5, r, r/2);
          },
          star4 :  function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 4, r, r/3);
          },
          star6 :  function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 6, r, r/2);
          },
          snowflake :  function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 6, r, r/5);
          },
          star8 :  function(c, x, y, w) {
            var r = w/2;
            drawStar(c, x+r, y+r, 8, r*1.2, r/3);
          },

          // connected shapes
          zebra :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedHorizontally(c, x, y, w, h, qr, row, col, 0.8, 'circleSmall');
          },
          zebraVertical :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedVertically(c, x, y, w, h, qr, row, col, 0.8, 'circleSmall');
          },
          zebraThin :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedHorizontally(c, x, y, w, h, qr, row, col, 0.6, 'dot');
          },
          zebraThinVertical :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedVertically(c, x, y, w, h, qr, row, col, 0.6, 'dot');
          },
          star6Vertical :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedVertically(c, x, y, w, h, qr, row, col, 0.5, 'star8');
          },
          star6Horizontal :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedHorizontally(c, x, y, w, h, qr, row, col, 0.5, 'star8');
          },
          pcbVertical :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedVertically(c, x, y, w, h, qr, row, col, 0.5, 'circle');
          },
          pcbHorizontal :  function(c, x, y, w, h, qr, row, col) {
            drawLinkedHorizontally(c, x, y, w, h, qr, row, col, 0.5, 'circle');
          },
          circleWideLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 1, 'circle');
          },
          diamondLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.5, 'diamond');
          },
          diamondWideLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 1, 'diamond');
          },
          pcbLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.5, 'circle');
          },
          mosaicLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.5, 'mosaic');
          },
          circleLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.5, 'circle');
          },
          squareSmallLinked :  function(c, x, y, w, h, qr, row, col) {
              drawLinked(c, x, y, w, h, qr, row, col, 0.5, 'squareSmall');
          },
          mosaicThinLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.3, 'mosaic');
          },
          circleThinLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.3, 'circle');
          },
          pcbThinLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.3, 'circleSmall');
          },
          diamondThinLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.3, 'diamond');
          },
          squareSmallThinLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.3, 'squareSmall');
          },
          star8ThinLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.3, 'star8');
          },
          star4ThinLinked :  function(c, x, y, w, h, qr, row, col) {
            drawLinked(c, x, y, w, h, qr, row, col, 0.3, 'star4');
          }
        };

        var gradientFunc = {
          diagonal :      function(c,w) {  return c.createLinearGradient(0,0, w, w);  },
          diagonalLeft :  function(c,w) {  return c.createLinearGradient(w,0, 0, w);  },
          horizontal :    function(c,w) {  return c.createLinearGradient(0,0, w, 0);  },
          vertical :      function(c,w) {  return c.createLinearGradient(0,0, 0, w);  },
          radial :        function(c,w) {
            var r=w/2;
            return c.createRadialGradient(r,r, r, r, r,0);
          },
          radialInverse : function(c,w) {
            var r=w/2;
            return c.createRadialGradient(r,r, 0, r, r,r);
          }
        };
        /** w - qr width, t - module widthm, d - half of module (delta), s - eye side, r - eye radius*/
        var drawRound = function(c,w,t,d,s,r) {
          var k=2, p=t*k+d, d2=d*2, p2=t*k+d2, sd=s+d;
          c.beginPath();
          c.moveTo(p,d);
          c.lineTo(sd-p2,d);
          c.quadraticCurveTo( sd-d2, d, sd-d2,p);
          c.lineTo(sd-d2,sd-p2);
          c.quadraticCurveTo(sd-d2,sd-d2,sd-p2,sd-d2);
          c.lineTo(p,sd-d2);
          c.quadraticCurveTo(d,sd-d2,d,sd-p2);
          c.lineTo(d,p);
          c.quadraticCurveTo(d,d,p,d, 0, 0);
          c.closePath();
          c.stroke();
        };
         var drawCookie2 = function(c,w,t,d,s,r) {
          var k=2, p=t*k+d, p2=t*k+t, sd=s+d, dd=t+t;
          c.beginPath();
          c.moveTo(p,d);
          c.lineTo(sd-p2+t,d);
          c.quadraticCurveTo( sd-dd, d+t, sd-t,p-t);
          c.lineTo(sd-t,sd-p2);
          c.quadraticCurveTo(sd-t,sd-t,sd-p2,sd-t);
          c.lineTo(d+t,sd-t);
          c.quadraticCurveTo(t+d,sd-dd,d,sd-p2+t);
          c.lineTo(d,p);
          c.quadraticCurveTo(d,d,p,d, 0, 0);
          c.closePath();
          c.stroke();
        };
        var drawCookie = function(c,w,t,d,s,r) {
          var storedLineCap = c.lineCap;
          c.lineCap = 'round';
          var k=2, p=t*k+d, p2=t*k+t, sd=s+d, dd=t+t;
          c.beginPath();
          c.moveTo(p,d);
          c.lineTo(sd-p2,d);
          c.quadraticCurveTo( sd-t, d, sd-t,p);
          c.lineTo(sd-t,sd-p2+t);
          c.quadraticCurveTo(sd-dd,sd-dd,sd-p2+t,sd-t);
          c.lineTo(p,sd-t);
          c.quadraticCurveTo(d,sd-t,d,sd-p2);
          c.lineTo(d,p-t);
          c.quadraticCurveTo(t+d,t+d,p-t,d, 0, 0);
          c.closePath();
          c.stroke();
          c.lineCap = storedLineCap;
        };
        var drawOcta = function(c,w,t,d,s,r) {
          var k=1, p=t*k+d, d2=d*2, p2=t*k+d2, sd=s+d;
          c.beginPath();
          c.moveTo(p,d);
          c.lineTo(sd-p2,d);
          c.lineTo(sd-d2,p);
          c.lineTo(sd-d2,sd-p2);
          c.lineTo(sd-p2,sd-d2);
          c.lineTo(p,sd-d2);
          c.lineTo(d,sd-p2);
          c.lineTo(d,p);
          c.lineTo(p,d);
          c.closePath();
          c.stroke();
        };
        var drawLeaf = function(c,w,t,d,s,r) {
          var k=2, p=t*k+d, d2=d*2, p2=t*k+d2, sd=s+d;
          c.beginPath();
          c.moveTo(d, d);
          c.lineTo(sd - p2, d);
          c.quadraticCurveTo(sd - d2, d, sd - d2, p);
          c.lineTo(sd - d2, sd - d2);
          c.lineTo(p, sd - d2);
          c.quadraticCurveTo(d, sd - d2, d, sd - p2);
          c.lineTo(d, d);
          c.closePath();
          c.stroke();
        };
        var drawLeafSharp = function(c,w,t,d,s,r) {
          var k=2, p=t*k+d, d2=d*2, b=d+d/2, p2=t*k+d2, sd=s+d;
          c.beginPath();
          c.moveTo(d, d);
          c.lineTo(sd - p2, b);
          c.quadraticCurveTo(sd-d2, b, sd-d2, p+d);
          c.lineTo(sd-d2, sd-d2);
          c.lineTo(p+b, sd-d2);
          c.quadraticCurveTo(b, sd-d2, b, sd-p2);
          c.lineTo(d, d);
          c.closePath();
          c.stroke();
        };
        var roundCorner = function(c,w,t,d,s,r) {
          var k=2, p=t*k+d, d2=d*2, p2=t*k+d2, sd=s+d;
          c.beginPath();
          c.moveTo(p,d);
          c.lineTo(sd-d2,d);
          c.lineTo(sd-d2,sd-d2);
          c.lineTo(d,sd-d2);
          c.lineTo(d,p);
          c.quadraticCurveTo(d,d,p,d, 0, 0);
          c.closePath();
          c.stroke();
        };
        var drawPetal = function(c,w,t,d,s,r) {
          var k=2, p=t*k+d, d2=d*2, p2=t*k+d2, sd=s+d;
          c.beginPath();
          c.moveTo(p,d);
          c.lineTo(sd-p2,d);
          c.quadraticCurveTo( sd-d2, d, sd-d2,p);
          c.lineTo(sd-d2,sd-d2);
          c.lineTo(p,sd-d2);
          c.quadraticCurveTo(d,sd-d2,d,sd-p2);
          c.lineTo(d,p);
          c.quadraticCurveTo(d,d,p,d, 0, 0);
          c.closePath();
          c.stroke();
        };

        var drawShapedHelper = function(shape,density,c,w,t,d,s,r) {
          var draw = drawShapeFunc[shape] || drawShapeFunc.circle;
          var st = s-t;
          for(var i=0;i<6;i+=1/density) {
            draw(c,i*t, 0, t, t);
            draw(c,st-i*t, st, t, t);
            draw(c,0, st-i*t, t, t);
            draw(c,st, i*t, t, t);
          }
        };

        var getDrawShapedFunc = function(shape,density,c,w,t,d,s,r) {
          return function(c,w,t,d,s,r) {
            drawShapedHelper(c,shape,w,t,d,s,r,density);
          };
        };

        // var drawAllEyesShaped = function(shape,density,c,w,t,d,s,r) {
        //   drawAllEyes(
        //     getDrawShapedFunc(shape,density,c,w,t,d,s,r),
        //     c,w,t,d,s,r
        //   );
        // };

        var drawAllEyeFrames = function(draw,c,w,t,d,s,r) {
          var oldTransform = c.getTransform();
          draw(c,w,t,d,s,r); // top left eye
          c.rotate(Math.PI/2);
          c.translate(0,-w);
          draw(c,w,t,d,s,r); // top right eye
          c.translate(0,w);
          c.rotate(-Math.PI);
          c.translate(-w,0);
          draw(c,w,t,d,s,r); // bottom left eye
          c.setTransform(oldTransform);
        };

        var drawEyeFrameFunc = {
          square :  function(c,w,t,d,s,r) {
            var l=s-t, e=w-l-d;
            c.strokeRect(d,d,l,l);
          },
          squaredSmall : function(c,w,t,d,s,r) {
            drawShapedHelper('squareSmall',1,c,w,t,d,s,r);
          },
          circle :  function(c,w,t,d,s,r) {
            var rd=r-d, wr=w-r;
            c.beginPath();
            c.ellipse(r, r, rd, rd, 0, 0, 2 * Math.PI);
            c.stroke();
          },
          octa :  function(c,w,t,d,s,r) {
            drawOcta(c,w,t,d,s,r);
          },
          round :  function(c,w,t,d,s,r) {
            drawRound(c,w,t,d,s,r);
          },
          leaf :  function(c,w,t,d,s,r) {
            drawLeaf(c,w,t,d,s,r);
          },
          leafSharp :  function(c,w,t,d,s,r) {
            drawLeafSharp(c,w,t,d,s,r);
          },
          roundCorner :  function(c,w,t,d,s,r) {
            roundCorner(c,w,t,d,s,r);
          },
          petal :  function(c,w,t,d,s,r) {
            drawPetal(c,w,t,d,s,r);
          },
          cookie : function(c,w,t,d,s,r) {
            drawCookie(c,w,t,d,s,r);
          },
          cookie2 : function(c,w,t,d,s,r) {
            drawCookie2(c,w,t,d,s,r);
          },
          dotted : function(c,w,t,d,s,r) {
            drawShapedHelper('dot',1,c,w,t,d,s,r);
          },
          dottedTight : function(c,w,t,d,s,r) {
            drawShapedHelper('dot',1.5,c,w,t,d,s,r);
          },
          circled : function(c,w,t,d,s,r) {
            drawShapedHelper('circle',1,c,w,t,d,s,r);
          },
          circledTight : function(c,w,t,d,s,r) {
            drawShapedHelper('circle',1.5,c,w,t,d,s,r);
          },
          diamond : function(c,w,t,d,s,r) {
            drawShapedHelper('diamond',1,c,w,t,d,s,r);
          },
          diamondTight : function(c,w,t,d,s,r) {
            drawShapedHelper('diamond',1.5,c,w,t,d,s,r);
          },
          mosaic : function(c,w,t,d,s,r) {
            drawShapedHelper('mosaic',1,c,w,t,d,s,r);
          },
          mosaicTight : function(c,w,t,d,s,r) {
            drawShapedHelper('mosaic',1.5,c,w,t,d,s,r);
          },
          starred : function(c,w,t,d,s,r) {
            drawShapedHelper('star',1,c,w,t,d,s,r);
          },
          starredTight : function(c,w,t,d,s,r) {
            drawShapedHelper('star',1.5,c,w,t,d,s,r);
          },
          starred4 : function(c,w,t,d,s,r) {
            drawShapedHelper('star4',1,c,w,t,d,s,r);
          },
          starred4Tight : function(c,w,t,d,s,r) {
            drawShapedHelper('star4',1.5,c,w,t,d,s,r);
          },
          starred6 : function(c,w,t,d,s,r) {
            drawShapedHelper('star6',1,c,w,t,d,s,r);
          },
          starred6Tight : function(c,w,t,d,s,r) {
            drawShapedHelper('star6',1.5,c,w,t,d,s,r);
          },
          starred8 : function(c,w,t,d,s,r) {
            drawShapedHelper('star8',1,c,w,t,d,s,r);
          },
          starred8Tight : function(c,w,t,d,s,r) {
            drawShapedHelper('star8',1.5,c,w,t,d,s,r);
          },
          snowflakes : function(c,w,t,d,s,r) {
            drawShapedHelper('snowflake',1,c,w,t,d,s,r);
          },
          snowflakesTight : function(c,w,t,d,s,r) {
            drawShapedHelper('snowflake',1.5,c,w,t,d,s,r);
          },

          none : function(){}
        };
        
        var drawEyeBallShape = function (shape, c,w,t,s,r) {
          var draw = drawShapeFunc[shape] || drawShapeFunc.square;
          var x=t*2, h=t*3;
          draw(c,x,x,h,h);
        };

        var drawEyeBallFunc = {


          none : function(){}
        };


        var someShapes = ['square', 'circle', 'diamond', 'star', 'star6', 'star8'];
        someShapes.forEach(function(shape, c,w,t,s,r){
          drawEyeBallFunc[shape] = function(c,w,t,s,r) { drawEyeBallShape(shape, c,w,t,s,r); };
        });

        var drawAllEyeBalls = function(draw,c,w,t,s,r) {
          var oldTransform = c.getTransform();
          var l = w-s*2-t;
          draw(c,w,t,s,r); // top left eye
          c.translate(l,0);
          draw(c,w,t,s,r); // top right eye
          c.translate(-l,l);
          draw(c,w,t,s,r); // bottom left eye
          c.setTransform(oldTransform);
        };

        var draw = function(context, qr, modules, tile, customDesign){
          var testDesign = {
            // bodyShape :  square, squareSmall, circle, circleBig, circleSmall,
            // dot, diamond, mosaic, star, star4, star6, star8, snowflake
            bodyShape : 'pcbThinLinked',
            // Gradient :  diagonal, diagonalLeft, horizontal, vertical, radial, radialInverse
            gradient : 'radialInverse',
            //MAYBE Fill pattern https : //developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern
            color :       '#E6CA40',
            colorMiddle : '#E6CA40',
            colorFinish : '#351143',
            // Eyes
            // eyeShape :    'square',
            // eyeColor :      'lightGray',
            // square, circle, octa, round, leaf, petal,
            eyeFrameShape :  'leaf',
            eyeFrameColor :  'red',//'#858A8F',
            eyeBallShape :  'star8',
            eyeBallColor :  '#2F0A43',
            //Logo image
            logoImageElementId :  'logoImage',
            logoImageScale :  0.5,
            removeBackgroundBehindLogo :  true //TODO
            //TODO Border
            //TODO BG color
          };
          var design = defaultDesign;
          if (customDesign) for (var a in customDesign) { design[a] = customDesign[a]; }

          var width  = modules*tile;

          var isEye = function(row, col) {
            return (row<7 && col<7) || (row<7 && (modules-col<=7)) || ((modules-row<=7) && col<7);
          };

          // fill style & gradient
          var eyeFillStyle = design.eyeColor;
          var bodyFillStyle = design.color || '#000';
          if (design.gradient) {
            bodyFillStyle = gradientFunc[design.gradient](context, width);
            bodyFillStyle.addColorStop(0, design.color || '#000');
            if (design.colorMiddle) bodyFillStyle.addColorStop(0.5, design.colorMiddle);
            if (design.colorFinish) bodyFillStyle.addColorStop(1.0, design.colorFinish);
          }

          var bodyDrawShape = drawShapeFunc[design.bodyShape] || drawShapeFunc.square;
          var eyeDrawShape  = drawShapeFunc[design.eyeShape ] || drawShapeFunc.square;

          for (var row = 0; row < modules; row++) {
            for (var col = 0; col < modules; col++) {
              var x = Math.round(col * tile),
                  y = Math.round(row * tile);
              var w = (Math.ceil((col + 1) * tile) - Math.floor(col * tile)),
                  h = (Math.ceil((row + 1) * tile) - Math.floor(row * tile));

              if (qr.isDark(row, col)) {
                if (isEye(row, col, modules)) {
                  if (design.eyeColor) {
                    context.fillStyle = eyeFillStyle;
                    eyeDrawShape(context, x, y, w, h, qr, row, col);
                  }
                } else {
                  context.fillStyle = bodyFillStyle;
                  bodyDrawShape(context, x, y, w, h, qr, row, col);
                }
              } else {
                // context.fillStyle =  '#fff';
                // context.fillRect(x, y, w, h);
              }
            }
          } // for

          // Eyes Frames
          {
            var eyeFrameShapeFunc = drawEyeFrameFunc[design.eyeFrameShape] || drawEyeFrameFunc.square;
            context.strokeStyle = design.eyeFrameColor;
            context.lineWidth = tile;
            var delta = tile / 2, side = tile * 7, radius = side / 2;
            drawAllEyeFrames(eyeFrameShapeFunc, context, width, tile, delta, side, radius);
          }
          // Eyes Balls
          {
            var eyeBallShapeFunc = drawEyeBallFunc[design.eyeBallShape] || drawEyeBallFunc.square;
            context.fillStyle = design.eyeBallColor;
            context.lineWidth = 1;
            var ballSide = tile * 3, eyeRadius = tile * 7 / 2;
            drawAllEyeBalls(eyeBallShapeFunc, context, width, tile, ballSide, eyeRadius);
          }
          // Logo Image
          var image = document.getElementById(design.logoImageElementId);
          if (image) {
            var aspect = image.naturalHeight / image.naturalWidth;
            var dWidth = width * design.logoImageScale;
            var dHeight = dWidth * aspect;
            var dx = (width - dWidth) / 2;
            var dy = (width - dHeight) / 2;
            context.drawImage(image, dx, dy, dWidth, dHeight);
          }
        };

        var render = function(canvas, value, typeNumber, correction, size, inputMode, customDesign){
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
            draw(context, qr, modules, tile, customDesign);
            scope.canvasImage = canvas.toDataURL() || '';
          }
        };

        var renderQR = function () {
          render(canvas, scope.TEXT, scope.TYPE_NUMBER, scope.CORRECTION, scope.SIZE, scope.INPUT_MODE, scope.design);
        };
        renderQR();

        $timeout(function(){
          scope.$watch('text', function(value, old){
            if (value !== old) {
              scope.TEXT = scope.getText();
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              renderQR();
            }
          });

          scope.$watch('correctionLevel', function(value, old){
            if (value !== old) {
              scope.CORRECTION = scope.getCorrection();
              renderQR();

            }
          });

          scope.$watch('typeNumber', function(value, old){
            if (value !== old) {
              scope.TYPE_NUMBER = scope.getTypeNumber();
              renderQR();

            }
          });

          scope.$watch('size', function(value, old){
            if (value !== old) {
              scope.SIZE = scope.getSize();
              renderQR();

            }
          });

          scope.$watch('inputMode', function(value, old){
            if (value !== old) {
              scope.INPUT_MODE = scope.getInputMode(scope.TEXT);
              renderQR();
            }
          });

          scope.$watch('design', function(value, old){
            console.log('design value', value);
            if (value !== old) {
              scope.design = scope.getDesign(scope.design);
              renderQR();
            }
          }, true); //deep watch
        });

      }
    };
  }]);

})(window.QRCode);
