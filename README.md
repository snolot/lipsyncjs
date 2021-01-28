# lipsyncjs
Attempt to create lipsync library for realtime use with three.js

## How to use:

```javascript
// Initialise library
const ls = lipsync();

// Then in update loop 
const update = time => {
	requestAnimationFrame(update);
	if(ls.isPlaying()){

		const bs = ls.getBlendShapes();
		if(bs){ 
			mesh.morphTargetInfluences[0] = bs["blendShapeLips"];
			mesh.morphTargetInfluences[1] = bs["blendShapeMouth"];
			mesh.morphTargetInfluences[2] = bs["blendShapeKiss"];
		}
	}

	renderer.render(scene, camera);
}

````