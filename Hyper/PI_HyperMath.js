
/* HyperSonic's Math Libary (to complement Cesium's math library)

I have a few functions here that do the same thing as Cesium math functions.
Many Cesium functions require a result parameter and some don't, so I made my own versions, none of which use a result parameter. 
Also I used naming conventions and parameter orders that are simply more intuitive for me.
The data format is totally compatible with Cesium, so you can mix and match Cesium math with this math with no problems at all.

1x3 Vector (a vector is a ray where origin is always (0,0,0), or non-applicable)
.x
.y
.z

3x3 Rotation matrix are assumed to be column based (rotation matrix uses this format)
East(x)   North(y)  Up(z) 
Right     Forward   Up
[0]       [3]      [6]    x components
[1]       [4]      [7]    y components
[2]       [5]      [8]    z components

4x4 TranRot matrix are assumed to be column based (modelMatrix uses this format)
East(x)   North(y)  Up(z) Pos
Right     Forward   Up
[0]       [4]      [8]    [12] x components
[1]       [5]      [9]    [13] y components
[2]       [6]      [10]   [14] z components
[3]       [7]      [11]   [15] w components (only used for intermediate carry over) (set 1 for ENU vectors, 0 for pos vector)

-You only need 2 vectors to describe a rotation matrix, the 3rd is simply gotten with a cross product. Just make sure those 2 vectors are orthogonal. 
-An even more compact method is just the direction vector with roll of the right vector, then up is gotten with cross product.
-Though nothing is more compact than 3 Euler angles, but it takes a alot computation to transfer between rotation matrix and Euler angles.

3x3 COMPACT TranRot matrix column based PROPOSAL
North(y)  Up(z)    Pos 
Forward   Up
[0]       [3]      [6]    x components
[1]       [4]      [7]    y components
[2]       [5]      [8]    z components

*/
if(!Hyper) {
    var Hyper = function (){};
}
//
// 2D
//
Hyper.math2D = function(){};
Hyper.math2D.dot = function(first,second){return first.x*second.x+first.y*second.y};

//
// 3D
//

Hyper.math3D = function(){};

//
// Basic functions
//
Hyper.math3D.dot = function(first,second){return first.x*second.x+first.y*second.y+first.z*second.z};
Hyper.math3D.cross = function(first,second)
{
	var result = new Cesium.Cartesian3();
	result.x = first.y * second.z - first.z * second.y;
	result.y = first.z * second.x - first.x * second.z;
	result.z = first.x * second.y - first.y * second.x;
	return result;
}
Hyper.math3D.reverse = function(first)
{
	var result = new Cesium.Cartesian3();
	result.x = -first.x;
	result.y = -first.y;
	result.z = -first.z;
	return result;
}

//
// Rotate functions
//

//credit: rotateVector logic from https://code.google.com/p/earth-api-samples/source/browse/trunk/lib/math3d.js
//http://www.apache.org/licenses/LICENSE-2.0

Hyper.math3D.rotateVector = function(rotatee,rotater,angle)	//around its own origin
{
	//rotatee: unit vector, rotatee: unit vector, angle:radians
	//CCW looking from vector tip to vector base
	var CC3=Cesium.Cartesian3;var rotated=new CC3();
	var c = Math.cos(angle);var s = Math.sin(angle);
	var dotScale = CC3.dot(rotatee,rotater,new CC3());
	var rotaterScaled = scaleVector(dotScale,rotater);
	var vPerpAxis = CC3.subtract(rotatee,rotaterScaled,new CC3()); //using Pythagoras theorem
	var comp1 = scaleVector(c,vPerpAxis);
	var vPerpPerpAxis = CC3.cross(rotater,vPerpAxis,new CC3()); //perp to both of these
	var comp2 = scaleVector(s,vPerpPerpAxis);
	return addVectors([rotaterScaled,comp1,comp2]);
}
Hyper.math3D.rotateMatrix = function(rotatee,rotater,angle)	//around its own origin
{
	//rotatee: Matrix 3x3, rotater: vector
	var CM3=Cesium.Matrix3;var getCol=Cesium.Matrix3.getColumn;var CC3=Cesium.Cartesian3;
	var rotated = new CM3(0,0,0,0,0,0,0,0,0);
	CM3.setColumn(rotated,0,rotateVector(getCol(rotatee,0,new CC3()),rotater,angle),rotated);
	CM3.setColumn(rotated,1,rotateVector(getCol(rotatee,1,new CC3()),rotater,angle),rotated);
	CM3.setColumn(rotated,2,rotateVector(getCol(rotatee,2,new CC3()),rotater,angle),rotated);
	return rotated;
}
Hyper.math3D.rotateAroundPoint = function() //TODO: change into code. rotate either vector or matrix around a point
{
	/*
	(psuedo code)
	dif_vec = center_pos - rotation_pos
	rotated_vector = Rotate dif_vec  around the desired axis by the desired angle.
	new_center = rotated_vector + rotation_pos
	Then rotate the entity's center around the desired axis by the desired angle. It actually doesn't matter if you rotate the entity around it's center first or second.
	*/
}

//
//HPR <-> Rotation Matrix conversions
//

Hyper.math3D.matrixToHPR = function(theMatrix)
{
	var CC3=Cesium.Cartesian3;var CM3=Cesium.Matrix3;
	var rig = CM3.getColumn(theMatrix,0,new CC3());
	var dir = CM3.getColumn(theMatrix,1,new CC3());
	var up = CM3.getColumn(theMatrix,2,new CC3());			
	var h,p,r;
	if((Math.abs(rig.z)<0.0000001) && (Math.abs(up.z)<0.0000001))
	{
		//if h and r weren't saved you have to guess h & r 
		r=0;
		if(dir.z>0){p=90;h = Math.atan2(-up.x,-up.y);}
		else{p=-90;h = Math.atan2(up.x,up.y);}
	}
	else //not vertical pitch
	{
		h = Math.atan2(dir.x,dir.y);
		p = Math.acos(-dir.z)-(Math.PI/2);
		r = Math.atan2(-rig.z,up.z);
	}
	return [h,p,r];
}
Hyper.math3D.HPRtoMatrix = function(hea,pit,rol) //reverse of matrixToHPR (input radians)
{
	var CC3 = Cesium.Cartesian3;
	var til=pit+(Math.PI/2);rol*=-1;	//Cesium to GE conversions
	var ch = Math.cos(hea);var sh = Math.sin(hea);
	var ct = Math.cos(til);var st = Math.sin(til);
	var cr = Math.cos(rol);var sr = Math.sin(rol);
	//logic I created for 6DOF Google Earth (similar to Quake1 AngleVectors but for a different coordinate system)
	var Ldir = new CC3(sh*st,ch*st,ct*-1);
	var Lrig = new CC3(ch*cr+sh*ct*sr,sh*cr*-1+ch*ct*sr,st*sr);
	var Lup = new CC3(sh*ct*cr+ch*sr*-1,ch*ct*cr+sh*sr,st*cr);
	return Hyper.math3D.vectorsToMatrix(Lrig,Ldir,Lup);
}

//
//HP <-> Vector conversions
//

Hyper.math3D.vectorToHP = function(transformee,transformer)	//I use this for Moon and Sun Azmimuth calculation.
{
	var Lvector = Hyper.math3D.vectorToTransform(transformee,transformer);
	var h,p;

	if((Math.abs(Lvector.x)<0.0000001) && (Math.abs(Lvector.y)<0.0000001))
	{
		//if h wasn't saved you have to guess h
		if(Lvector.z>0){p=90;h=0;}else{p=-90;h=0;}
	}
	else //not vertical pitch
	{
		h = Math.atan2(Lvector.x,Lvector.y);
		p = Math.acos(-Lvector.z)-(Math.PI/2); //-(Math.PI/2) converts from tilt to pitch
	}
	return [h,p];
}
Hyper.math3D.HPtoVector = function(heading,pitch) //reverse of vectorToHP
{
	//TODO (just reverse the logic in vectorToHP)
}

//
//TO and FROM transforms (vectors and matrices)
//

Hyper.math3D.vectorToTransform = function(transformee,transformer)
//This is column based. Matrix3.multiplyByVector is row based. Sure you could transpose, but why not just use this function.
{
	//transformee & transformer are both 'in term of' the same thing, transformed is transformee 'in terms of' transformer
	var CC3=Cesium.Cartesian3;var CM3=Cesium.Matrix3;var transformed = new CC3();
	transformed.x=CC3.dot(transformee,CM3.getColumn(transformer,0,new CC3()));
	transformed.y=CC3.dot(transformee,CM3.getColumn(transformer,1,new CC3()));
	transformed.z=CC3.dot(transformee,CM3.getColumn(transformer,2,new CC3()));
	return transformed;
}
Hyper.math3D.vectorFromTransform = function(transformee,transformer)	//This does the reverse of vectorToTransform.
{
	//transformee is already 'in terms of' transformer, transformed is transformee 'in terms of' what transformer is 'in terms of'
	var CC3=Cesium.Cartesian3;var CM3=Cesium.Matrix3;hm3=Hyper.math3D;
	var C1=hm3.scaleVector(transformee.x,CM3.getColumn(transformer,0,new CC3()));
	var C2=hm3.scaleVector(transformee.y,CM3.getColumn(transformer,1,new CC3()));
	var C3=hm3.scaleVector(transformee.z,CM3.getColumn(transformer,2,new CC3()));
	return hm3.addVectors([C1,C2,C3]); //transformed
}
Hyper.math3D.matrixToTransform = function(transformee,transformer)	//Same as vectorToTransform, but for 3 vectors at a time.
{
	//transformee & transformer are both 'in term of' the same thing, transformed is transformee 'in terms of' transformer
	var transformed = new Cesium.Matrix3();var CC3 = Cesium.Cartesian3;var i=0;var j=0;var k=0;
	while(i<9)
	{
		transformed[i]=transformee[j]*transformer[k] + transformee[j+1]*transformer[k+1] + transformee[j+2]*transformer[k+2]; //dot product
		i+=1;	//next element of transformed
		k+=3;	//next vector of transformer
		if(i%3==0) //onto the next vector in transformed
		{
			j+=3;	//next vector in transformee
			k=0;	//transformer is traversed 3 times
		} 
	}
	return transformed;
}
Hyper.math3D.matrixFromTransform = function(transformee,transformer) //Does reverse of matrixToTransform.
{
	//transformee is already 'in terms of' transformer, transformed is transformee 'in terms of' what transformer is 'in terms of'
	//TODO, use vectorFromTransform as a guide
	//vectorFromTransform(transformee,transformer)
	//vectorFromTransform(transformee,transformer)
	//vectorFromTransform(transformee,transformer)
	
	/*
	//DRU_LC -> DRU_WC using ENU_WC
	//same logic as Matrix4.multiplyByPointAsVector
	var CC3A = CC3.add;var CC3M = CC3.multiplyByScalar;
	var Cdir=new CC3();var Crig=new CC3();var Cup=new CC3();var tally;
	tally = new CC3(0,0,0); //direction
	CC3A(CC3M(east,Ldir.x,new CC3()),tally,tally);
	CC3A(CC3M(north,Ldir.y,new CC3()),tally,tally);
	CC3A(CC3M(up,Ldir.z,new CC3()),tally,Cdir);
	tally = new CC3(0,0,0); //right
	CC3A(CC3M(east,Lrig.x,new CC3()),tally,tally);
	CC3A(CC3M(north,Lrig.y,new CC3()),tally,tally);
	CC3A(CC3M(up,Lrig.z,new CC3()),tally,Crig);
	tally = new CC3(0,0,0); //up
	CC3A(CC3M(east,Lup.x,new CC3()),tally,tally);
	CC3A(CC3M(north,Lup.y,new CC3()),tally,tally);
	CC3A(CC3M(up,Lup.z,new CC3()),tally,Cup);
	//clone to camera
	CC3.clone(Cdir,camera.direction);
	CC3.clone(Crig,camera.right);
	CC3.clone(Cup,camera.up);
	*/
}

//
// Matrix group/ungroup
//

Hyper.math3D.vectorsToMatrix = function(first,second,third)	//Currently I use to make a camera rotation matrix.
{
	var CM3=Cesium.Matrix3;var temp = new CM3();
	CM3.setColumn(temp,0,first,temp);
	CM3.setColumn(temp,1,second,temp);
	CM3.setColumn(temp,2,third,temp);
	return temp;
}
Hyper.math3D.matrixToVectors = function(inMatrix) //reverse of vectorsToMatrix (untested function)
{
	var CM3=Cesium.Matrix3;var CC3=Cesium.Cartesian3;
	var first=new CC3();var second=new CC3();var third=new CC3();
	CM3.getColumn(inMatrix,0,first);
	CM3.getColumn(inMatrix,1,second);
	CM3.getColumn(inMatrix,2,third);
	return [first,second,third];
}

//
// Odds and ends
//

Hyper.math3D.addVectors = function(vectors) //Any number of vectors can be added in one swoop, unlike just 2 with Cartesian3.add()
{
	var resultant=new Cesium.Cartesian3(0,0,0);
	var i=0;while(i<vectors.length)
	{
		resultant.x+=vectors[i].x;
		resultant.y+=vectors[i].y;
		resultant.z+=vectors[i].z;
		i+=1;
	}
	return resultant;
}
Hyper.math3D.scaleVector = function(scale,vector)
//Same as Cartesian3.multiplyByScalar(), but the name is easier to remember and scalar is 1st parameter which is more intuitive for me.
{
	var temp = new Cesium.Cartesian3();
	temp.x=scale*vector.x;temp.y=scale*vector.y;temp.z=scale*vector.z;
	return temp;
}
Hyper.math3D.hasMagnitude = function(vector) //Zero length vectors cause problems, and why attempt calculating magnitude if all components are zero?
{if((vector.x != 0) || (vector.y != 0) || (vector.z != 0)){return true;}return false;}
Hyper.math3D.vectorUnitize = function(vector) //Why not reserve the word normal for orthogonal, and use Unitize for unitizing a vector.
{
	var CC3=Cesium.Cartesian3;
	if(Hyper.math3D.hasMagnitude(vector)){return CC3.normalize(vector,new CC3());}
	else {return new CC3(0,0,0);}
}
Hyper.math3D.distP2P_2D = function(pointA,pointB)
{
	var delta = {x:pointB.x-pointA.x,y:pointB.y-pointA.y};
	return Math.sqrt(Math.pow(delta.x,2) + Math.pow(delta.y,2));
}
Hyper.math3D.isOrthogonal = function(vector1,vector2)
{if(Cesium.Cartesian3.dot(vector1,vector2)==0){return true;}return false;}; //TODO maybe add a close enough epsilon
Hyper.math3D.isColinear = function(vector1,vector2) //Can't cross co-linear vectors, so here's a check.
{
	if((vector1.x==vector2.x)&&(vector1.y==vector2.y)&&(vector1.z==vector2.z)){return true;}
	Cesium.Cartesian3.negate(vector2,vector2);
	if((vector1.x==vector2.x)&&(vector1.y==vector2.y)&&(vector1.z==vector2.z)){return true;}
	return false;
}
Hyper.math3D.setView = function(hea,pit,rol) //TODO: change into code. Can be used for anything, not just camera
{
	//Camera.prototype.setView 
		//does matrixToTransform to ENU
		//then does HPR->Quaternion->Matrix. Why not skip the middle man and do HPR->Matrix?
		//then does matrixFromTransform
		
		//matrixToTransform to ENU
		//HPRtoMatrix(hea,pit,rol)
		//matrixFromTransform
}
