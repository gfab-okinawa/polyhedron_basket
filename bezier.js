function sliceLineParams(a,b){
  var dx=b.x-a.x
  var dy=b.y-a.y
  return [dy, -dx, -dy*a.x+dx*a.y]
}
function vectorMix(a,b,t){return {x: a.x*(1-t)+t*b.x, y: a.y*(1-t)+t*b.y}}
function pathLineSlice(beziers, linecoef){
  var outputs=[]
  var joins=[]
  beziers.map(function(bezier){
    var beziers=bezierLineSlice(bezier, linecoef)
    beziers.forEach(function(b,i){
      outputs.push(b)
      if(i>0)joins.push(b[0])
      else if(b[0].x!=bezier[0].x||b[0].y!=bezier[0].y)joins.push(b[0])
      if(i<beziers.length-1)joins.push(b[3])
      else if(b[3].x!=bezier[3].x||b[3].y!=bezier[3].y)joins.push(b[3])
    })
  })
  var starts={}
  outputs.forEach(function(b){starts[[b[0].x,b[0].y]]=true})
  joins.sort(function(a,b){
    var aa=linecoef[0]*a.y-linecoef[1]*a.x
    var bb=linecoef[0]*b.y-linecoef[1]*b.x
    return aa>bb?1:aa<bb?-1:0
  })
  var jstarts=[], jends=[]
  joins.forEach(function(j){
    if(starts[[j.x,j.y]])jstarts.push(j)
    else jends.push(j)
  })
  if(jends.length!=jstarts.length)console.error(jends.length,jstarts.length)
  for(var i=0;i<jstarts.length;i++){
    var p3=jstarts[i], p0=jends[i]||jends[jends.length-1]||p3
    outputs.push([p0,vectorMix(p0,p3,1/3),vectorMix(p0,p3,2/3),p3])
  }

  return outputs
}
function bezierLineSlice(bezier, linecoef){
  var xcoef=linecoef[0], ycoef=linecoef[1], ccoef=linecoef[2]
  var n=100;
  var a=bezier[0], b=bezier[1], c=bezier[2], d=bezier[3]
  function point(a,b,c,d,t){
    var ab=vectorMix(a,b,t), bc=vectorMix(b,c,t), cd=vectorMix(c,d,t)
    var abc=vectorMix(ab,bc,t), bcd=vectorMix(bc,cd,t)
    return vectorMix(abc,bcd,t)
  }
  function tval(t){
    var p=point(a,b,c,d,t)
    return p.x*xcoef+p.y*ycoef+ccoef
  }
  var ts=[]
  for(var i=0;i<=n;i++){ts[i]=tval(i/n)}
  var sections=[]
  function push(a,b){
    var prev=sections[sections.length-1]
    if(prev&&prev[1]==a)prev[1]=b;
    else sections.push([a,b])
  }
  function find(a,b){
    for(var i=0;i<20;i++){
      var c=(a+b)/2
      if(a==c||b==c)return c
      var av=tval(a)
      var bv=tval(b)
      var m,mv
      if(i%2==0)m=c
      else m=a+(b-a)*av/(av-bv)
      var mv=tval(m)
      if(av*mv<=0){
        b=m
        bv=mv
      }else{
        a=m
        av=mv
      }
    }
    return (a+b)/2
  }
  function subBezier(a,b,c,d,t0,t1){
    var aa=point(a,b,c,d,t0)
    var p1=point(a,b,c,d,t0*2/3+t1/3)
    var p2=point(a,b,c,d,t0/3+t1*2/3)
    var dd=point(a,b,c,d,t1)
    var bbcx=(27*p1.x-8*aa.x-dd.x)/6
    var bbcy=(27*p1.y-8*aa.y-dd.y)/6
    var bccx=(27*p2.x-aa.x-8*dd.x)/6
    var bccy=(27*p2.y-aa.y-8*dd.y)/6
    bb={x: (2*bbcx-bccx)/3, y: (2*bbcy-bccy)/3}
    cc={x: (2*bccx-bbcx)/3, y: (2*bccy-bbcy)/3}
    return [aa,bb,cc,dd]
  }
  for(var i=0;i<n;i++){
    if(ts[i]>=0&&ts[i+1]>=0)push(i/n,(i+1)/n)
    else if(ts[i]<0&&ts[i+1]>=0)push(find(i/n,(i+1)/n),(i+1)/n)
    else if(ts[i]>=0&&ts[i+1]<0)push(i/n,find(i/n,(i+1)/n))
  }
  if(sections.length==1&&sections[0]==0&&sections[1]==1)return [bezier]
  return sections.map(function(range){
    return subBezier(a,b,c,d,range[0],range[1])
  })
}
