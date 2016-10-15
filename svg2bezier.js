function svg2bezier(data){
  var div=document.createElement('div')
  div.innerHTML=data
  function traverse(el, names, cb){
    var nameset={}
    names.forEach(function(n){nameset[n]=true})
    function each(el, trans){
      if(!trans)trans=[1,0,0,1,0,0]
      var transform=(el.tagName&&el.getAttribute('transform'))
      if(transform)console.log(transform)
      var matched=transform&&transform.match(/\w+\([^\)]+\)/g)
      if(transform)console.log(matched)
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
      for(var i=0;i<el.childNodes.length;i++){
        var e=el.childNodes[i]
        if(e.tagName)each(e, trans)
        if(nameset[e.tagName])cb(e, trans)
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
  traverse(div, ['path', 'ellipse'], function(el, trans){
    function bezier(p0,p1,p2,p3){
      beziers.push([
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
    function ellipse(cx,cy,rx,ry){
      var N=16;
      for(var i=0;i<N;i++){
        var t0=i*Math.PI/N,t1=(i+1)*Math.PI/N
        var l=1/Math.cos(Math.PI/N/3)
        var p0={x: Math.cos(t0), y: Math.sin(t0)}
        var p1={x: l*Math.cos((2*t0+t1)/3), y: l*Math.sin((2*t0+t1)/3)}
        var p2={x: l*Math.cos((t0+2*t1)/3), y: l*Math.sin((t0+2*t1)/3)}
        var p3={x: Math.cos(t1), y: Math.sin(t1)}
        var p0123=[p0,p1,p2,p3].map(function(p){return {x:cx+rx*p.x,y:cy+ry*p.y}})
        bezier.apply(null, p0123)
      }
    }
    if(el.tagName=='circle'){
      ellipse(fval('cx'),fval('cy'),fval('r'),fval('r'))
    }
    if(el.tagName=='ellipse'){
      ellipse(fval('cx'),fval('cy'),fval('rx'),fval('ry'))
    }
    if(el.tagName=='path'){
      var matches=el.getAttribute('d').match(/[A-Za-z][^a-zA-Z]*/g)
      var point=null
      var start=null
      for(var i=0;i<matches.length;i++){
        var type=matches[i][0]
        var floats=(matches[i].match(/-?[\d.]+/g)||[]).map(parseFloat)
        var values=[];
        for(var j=0;2*j<floats.length;j++)values.push({x: floats[2*j], y: floats[2*j+1]})
        function pathpoint(a,b){
          if(type<='Z')return b
          return {x: a.x+b.x, y:a.y+b.y}
        }
        switch(type){
          case 'm':
          case 'M':
            point=pathpoint(point,values[0])
            if(!start)start=point
            break
          case 'c':
          case 'C':
          try{
            bezier(point, pathpoint(point,values[0]), pathpoint(point,values[1]), pathpoint(point,values[2]))
          }catch(e){console.error(point,values,matches[i],window.mama=matches);console.error(e);hoge()}
            point=pathpoint(point,values[2])
            break
          case 'l':
          case 'L':
            line(point, pathpoint(point,values[0]))
            point=pathpoint(point,values[0])
            break
          case 'h':
          case 'H':
            var v=values[0].x
            line(point, (point={x: type<='Z'?v:point.x+v, y: point.y}))
            break
          case 'v':
          case 'V':
            var v=values[0].x
            line(point, (point={x: point.x, y:type<='Z'?v:point.y+v}))
            break
          case 'z':
          case 'Z':
            if(start.x!=point.x||start.y!=point.y)line(point,start)
            break
        }

        if(isNaN(point.x)){
          console.error(el.getAttribute('d'))
          hoge()
        }
      }
    }
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
    b.forEach(function(p){
      p.x-=(maxs.x+mins.x)/2
      p.y-=(maxs.y+mins.y)/2
      p.x/=s
      p.y/=s
    })
  })
  return beziers
}
