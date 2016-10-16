function svg2bezier(data){
  var div=document.createElement('div')
  div.innerHTML=data
  function cross(a,b){
    return a.x*b.y-a.y*b.x
  }
  function traverse(el, cb){
    function each(el, trans){
      if(!trans)trans=[1,0,0,1,0,0]
      var transform=(el.tagName&&el.getAttribute('transform'))
      var matched=transform&&transform.match(/\w+\([^\)]+\)/g)
      if(matched){
        matched.forEach(function(){
          var tv=transform.split(/[()]/, 2)
          var type=tv[0], values=tv[1].split(/, */).map(parseFloat)
          var matrix=[1,0,0,1,0,0]
          if(type=='scale')matrix=[values[0],0,0,values[1],0,0]
          if(type=='matrix')matrix=values
          if(type=='skewX')matrix=[1,0,Math.tan(values[0]*Math.PI/180),1,0,0]
          if(type=='skewY')matrix=[1,Math.tan(values[0]*Math.PI/180),0,1,0,0]
          if(type=='rotate'){
            var angle=values[0]
            var cx=values[1]||0, cy=values[2]||0
            var cos=Math.cos(angle*Math.PI/180)
            var sin=Math.sin(angle*Math.PI/180)
            matrix=[cos, sin, -sin, cos, cx-cx*cos+cy*sin, cy-cx*sin-cy*cos]
          }
          if(type=='translate')matrix=[1,0,0,1,values[0],values[1]]
          trans=[
            trans[0]*matrix[0]+trans[2]*matrix[1],
            trans[1]*matrix[0]+trans[3]*matrix[1],
            trans[0]*matrix[2]+trans[2]*matrix[3],
            trans[1]*matrix[2]+trans[3]*matrix[3],
            trans[0]*matrix[4]+trans[2]*matrix[5]+trans[4],
            trans[1]*matrix[4]+trans[3]*matrix[5]+trans[5]
          ]
        })
      }
      cb(el, trans)
      for(var i=0;i<el.childNodes.length;i++){
        var e=el.childNodes[i]
        if(e.tagName)each(e, trans)
      }
    }
    each(el)
  }
  function translate(p, trans){
    return {
      x: trans[0]*p.x+trans[2]*p.y+trans[4],
      y: trans[1]*p.x+trans[3]*p.y+trans[5]
    }
  }
  var beziers=[]
  traverse(div, function(el, trans){
    var current=[]
    function bezier(p0,p1,p2,p3){
      current.push([
        translate(p0,trans),
        translate(p1,trans),
        translate(p2,trans),
        translate(p3,trans)
      ])
    }
    function line(p0,p1){
      bezier(p0,{x:(2*p0.x+p1.x)/3,y:(2*p0.y+p1.y)/3},{x:(p0.x+2*p1.x)/3,y:(p0.y+2*p1.y)/3},p1)
    }
    function fval(key){return parseFloat(el.getAttribute(key))}
    function arc(cx,cy,rx,ry,tfrom,tto,rot){
      if(tfrom===undefined){
        tfrom=0
        tto=2*Math.PI
      }
      var cos=Math.cos(rot||0), sin=Math.sin(rot||0)
      var N=16
      for(var i=0;i<N;i++){
        var t0=tfrom+(tto-tfrom)*i/N,t1=tfrom+(tto-tfrom)*(i+1)/N
        var l=1/Math.cos((t1-t0)/3)
        var p0={x: Math.cos(t0), y: Math.sin(t0)}
        var p1={x: l*Math.cos((2*t0+t1)/3), y: l*Math.sin((2*t0+t1)/3)}
        var p2={x: l*Math.cos((t0+2*t1)/3), y: l*Math.sin((t0+2*t1)/3)}
        var p3={x: Math.cos(t1), y: Math.sin(t1)}
        var p0123=[p0,p1,p2,p3].map(function(p){
          return {
            x:cx+rx*p.x*cos-ry*p.y*sin,
            y:cy+ry*p.y*cos+rx*p.x*sin
          }
        })
        bezier.apply(null, p0123)
      }
    }
    if(el.tagName=='circle'){
      arc(fval('cx'),fval('cy'),fval('r'),fval('r'))
    }
    if(el.tagName=='ellipse'){
      arc(fval('cx'),fval('cy'),fval('rx'),fval('ry'))
    }
    if(el.tagName=='polygon'||el.tagName=='polyline'){
      var floats=el.getAttribute('points').match(/-?[\d.]+/g).map(parseFloat)
      var numpoints=floats.length/2+(el.tagName=='polygon'?1:0)
      for(var i=0;i<numpoints;i++){
        var p={x: floats[2*i], y: floats[2*i+1]}
        var q={x: floats[(2*i+2)%floats.length], y: floats[(2*i+3)%floats.length]}
        line(p, q)
        point=q
      }
    }
    if(el.tagName=='path'){
      var matches=el.getAttribute('d').match(/[A-Za-z][^a-zA-Z]*/g)
      var point=null
      var start=null
      current=[]
      for(var i=0;i<matches.length;i++){
        var type=matches[i][0]
        var floats=(matches[i].match(/-?[\d.]+/g)||[]).map(parseFloat)
        var values=[];
        for(var j=0;2*j<floats.length;j++)values.push({x: floats[2*j], y: floats[2*j+1]})
        function pathpoint(a,b){
          if(!a||type<='Z')return b
          return {x: a.x+b.x, y:a.y+b.y}
        }
        function pathvalue(a,b){
          if(type<='Z')return b
          return (a||0)+b
        }
        switch(type){
          case 'm':
          case 'M':
            if(start&&(start.x!=point.x||start.y!=point.y))line(point,start)
            for(var j=0;j<values.length;j++){
              point=pathpoint(point,values[j])
              start=point
            }
            break
          case 'c':
          case 'C':
            for(var j=0;j<values.length/3;j++){
              var p1=pathpoint(point,values[3*j]), p2=pathpoint(point,values[3*j+1]), p3=pathpoint(point,values[3*j+2])
              bezier(point, p1, p2, p3)
              point=p3
            }
            break
          case 's':
          case 'S':
            for(var j=0;j<values.length/2;j++){
              var bprev=current[current.length-1][2]||point
              var p1={x: 2*point.x-bprev.x, y: 2*point.y-bprev.y}
              var p2=pathpoint(point,values[2*j]), p3=pathpoint(point,values[2*j+1])
              bezier(point, p1, p2, p3)
              point=p3
            }
            break
          case 'l':
          case 'L':
            for(var j=0;j<values.length;j++){
              var p=pathpoint(point,values[j])
              line(point, p)
              point=p
            }
            break
          case 'h':
          case 'H':
            for(var j=0;j<floats.length;j++){
              var p={x: type<='Z'?floats[j]:point.x+floats[j], y: point.y}
              line(point, p)
              point=p
            }
            break
          case 'v':
          case 'V':
            for(var j=0;j<floats.length;j++){
              var p={x: point.x, y: type<='Z'?floats[j]:point.y+floats[j]}
              line(point, p)
              point=p
            }
            break
          case 'q':
          case 'Q':
            for(var j=0;j<values.length/2;j++){
              var p1=pathpoint(point, values[2*j])
              var p2=pathpoint(point, values[2*j+1])
              bezier(point, {x:(point.x+2*p1.x)/3,y:(point.y+2*p1.y)/3}, {x:(p2.x+2*p1.x)/3,y:(p2.y+2*p1.y)/3}, p2)
              point=p2
            }
            break
          case 'a':
          case 'A':
            for(var j=0;j<floats.length/7;j++){
              var rx=floats[7*j], ry=floats[7*j+1], rot=floats[7*j+2]*Math.PI/180
              var lflag=floats[7*j+3], sflag=floats[7*j+4]
              var dst={x: pathvalue(point.x,floats[7*j+5]), y: pathvalue(point.y,floats[7*j+6])}
              var xvec={x: Math.cos(rot), y: Math.sin(rot)}
              var yvec={x: -xvec.y, y: xvec.x}
              var x0=(point.x*xvec.x+point.y*xvec.y)/rx
              var y0=(point.x*yvec.x+point.y*yvec.y)/ry
              var x1=(dst.x*xvec.x+dst.y*xvec.y)/rx
              var y1=(dst.x*yvec.x+dst.y*yvec.y)/ry
              var dl=Math.sqrt((x1-x0)*(x1-x0)+(y1-y0)*(y1-y0))/2
              var dh=Math.sqrt(1-dl*dl)
              var dir=((sflag&&1)+(lflag&&1))%2?-1:1
              var cx=(x0+x1)/2+dir*(y1-y0)*dh/dl/2
              var cy=(y0+y1)/2-dir*(x1-x0)*dh/dl/2

              var t0=Math.atan2(y0-cy,x0-cx)
              var t1=Math.atan2(y1-cy,x1-cx)
              function swap(){var _t0=t0;t0=t1;t1=_t0}
              if(t1<t0)swap()
              if(t1>t0+Math.PI){
                t1-=2*Math.PI
                swap()
              }
              if(lflag){t1-=2*Math.PI}
              arc(
                cx*rx*xvec.x+cy*ry*yvec.x,
                cx*rx*xvec.y+cy*ry*yvec.y,
                rx,ry,t0,t1,rot
              )
              point=dst
            }
            break
          case 'z':
          case 'Z':
            if(start.x!=point.x||start.y!=point.y)line(point,start)
            point=start
            break
          default:
            console.error(type)
        }
      }
      if(start&&(start.x!=point.x||start.y!=point.y))line(point,start)
    }
    var area=0;
    current.forEach(function(b){
      var b1={x: (8*b[0].x+12*b[1].x+6*b[2].x+b[3].x)/27, y: (8*b[0].y+12*b[1].y+6*b[2].y+b[3].y)/27}
      var b2={x: (b[0].x+6*b[1].x+12*b[2].x+8*b[3].x)/27, y: (b[0].y+6*b[1].y+12*b[2].y+8*b[3].y)/27}
      area+=cross(b[0],b1)+cross(b1,b2)+cross(b2,b[3])
    })
    if(area*area<0.0001)return
    var fillcolor=el.getAttribute('fill')||''
    if(!fillcolor){
      var styles=(el.getAttribute('style')||'').match(/fill\s*\s*:([^;]+)/)
      if(styles)fillcolor=styles[1]
    }
    fillcolor=fillcolor.toLowerCase()
    var fillwhite=fillcolor=='white'||fillcolor=='#fff'||fillcolor=='#ffffff'||!!fillcolor.match(/(255|100%).+(255|100%).+(255|100%)/)
    var flip=(area>0)^(fillwhite)
    current.forEach(function(bezier){
      if(flip)beziers.push(bezier.reverse())
      else beziers.push(bezier)
    })
  })
  var mins, maxs
  beziers.forEach(function(b){
    b.forEach(function(p){
      if(!mins)mins={x:p.x,y:p.y}
      if(!maxs)maxs={x:p.x,y:p.y}
      if(p.x<mins.x)mins.x=p.x
      if(p.y<mins.y)mins.y=p.y
      if(maxs.x<p.x)maxs.x=p.x
      if(maxs.y<p.y)maxs.y=p.y
    })
  })
  var w=maxs.x-mins.x
  var h=maxs.y-mins.y
  var s=Math.max(w,h)

  beziers.forEach(function(b){
    var resolution=1024*1024*1024
    b.forEach(function(p){
      p.x=(p.x-(maxs.x+mins.x)/2)/s
      p.y=(p.y-(maxs.y+mins.y)/2)/s
      p.x=Math.round(p.x*resolution)/resolution
      p.y=Math.round(p.y*resolution)/resolution
    })
  })

  return beziers
}
