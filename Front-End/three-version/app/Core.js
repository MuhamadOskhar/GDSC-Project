import * as THREE from "three";
import * as CANNON from "cannon-es";
import { PointerLockControlsCannon } from "./PointerLockControlsCannon.js";
import { UserCamera } from "./UserCamera.js";
import { WorldScene } from "./WorldScene.js";
import { WorldPhysics } from "./WorldPhysics.js";

export class Core extends THREE.WebGLRenderer {
  constructor(listBox = [], listSphere = [], nextLevel) {
    // Set renderer (This class)
    super({ antialias: true });
    this.nextLevel = nextLevel;

    // Initial perspective camera
    this.camera = new UserCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Initial scene world
    this.scene = new WorldScene();
    this.world = new WorldPhysics(20);

    this.setSize(window.innerWidth, window.innerHeight);
    this.setClearColor(this.scene.fog.color);
    this.shadowMap.enabled = true;
    this.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.domElement);

    this.timeStep = 1 / 60;
    this.lastCallTime = performance.now();
    this.boxes = [];
    this.boxMeshes = [];
    this.instructions = document.getElementById("instructions");

    // Runing setter method
    this.setControls();
    this.setListener();
    this.setObjectBlender(listBox, listSphere);
    this.animate(nextLevel);
  }

  setControls() {
    this.controls = new PointerLockControlsCannon(
      this.camera,
      this.world.sphereBody
    );
    this.scene.add(this.controls.getObject());
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.setSize(window.innerWidth, window.innerHeight);
  }

  onClick() {
    this.controls.lock();
  }

  onLock() {
    this.controls.enabled = true;
    this.instructions.style.display = "none";
  }

  onUnlock() {
    this.controls.enabled = false;
    this.instructions.style.display = null;
  }

  setListener() {
    window.addEventListener("resize", this.onWindowResize.bind(this));
    this.instructions.addEventListener("click", this.onClick.bind(this));
    this.controls.addEventListener("lock", this.onLock.bind(this));
    this.controls.addEventListener("unlock", this.onUnlock.bind(this));
  }

  setObjectBlender(listBox, listSphere) {
    for (let i = 0; i < listBox.length; i++) {
      this.createBox(listBox[i]);
    }
    for (let i = 0; i < listSphere.length; i++) {
      this.createSphere(listSphere[i]);
    }
  }

  // create
  createBox(paramObject) {
    // Set default parameter
    const defaultParam = {
      role: "normal",
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scaleX: 2,
      scaleY: 2,
      scaleZ: 2,
      mass: 5,
      damping: 0.01,
      material: this.scene.materialA,
    };
    const fixParam = Object.assign(defaultParam, paramObject);

    // Add normal boxes
    const halfExtents = new CANNON.Vec3(
      0.5 * fixParam.scaleX,
      0.5 * fixParam.scaleY,
      0.5 * fixParam.scaleZ
    );
    const boxShape = new CANNON.Box(halfExtents);
    const boxGeometry = new THREE.BoxGeometry(
      halfExtents.x * 2,
      halfExtents.y * 2,
      halfExtents.z * 2
    );
    const boxBody = new CANNON.Body({
      mass: fixParam.mass,
      shape: boxShape,
    });
    // Mengatur damping linear
    boxBody.linearDamping = fixParam.damping;
    boxBody.angularDamping = fixParam.damping;
    boxBody.role = fixParam.role;
    const boxMesh = new THREE.Mesh(boxGeometry, fixParam.material);

    // Set position
    boxBody.position.set(
      fixParam.positionX,
      fixParam.positionY,
      fixParam.positionZ
    );
    boxMesh.position.copy(boxBody.position);

    if (
      !(
        fixParam.rotationX == 0 &&
        fixParam.rotationY == 0 &&
        fixParam.rotationZ == 0
      )
    ) {
      const rotationQuaternion = new CANNON.Quaternion();
      rotationQuaternion.setFromAxisAngle(
        new CANNON.Vec3(
          fixParam.rotationX,
          fixParam.rotationY,
          fixParam.rotationZ
        ),
        Math.PI / 4
      );

      boxBody.quaternion.copy(rotationQuaternion);
      boxMesh.quaternion.copy(boxBody.quaternion);
    }

    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;

    this.world.addBody(boxBody);
    this.scene.add(boxMesh);
    this.boxes.push(boxBody);
    this.boxMeshes.push(boxMesh);
  }

  createSphere(paramObject) {
    // Set default parameters
    const defaultParam = {
      role: "normal",
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationX: 0,
      rotationY: 0,
      rotationZ: 0,
      scale: 2,
      mass: 5,
      material: this.scene.materialA,
      damping: 0.01,
    };

    const fixedParam = Object.assign(defaultParam, paramObject);

    // Create Cannon.js sphere
    const sphereShape = new CANNON.Sphere(fixedParam.scale); // Use the average scale for radius
    const sphereBody = new CANNON.Body({
      mass: fixedParam.mass,
      shape: sphereShape,
    });
    // Mengatur damping linear
    sphereBody.linearDamping = fixedParam.damping;
    sphereBody.angularDamping = fixedParam.damping;

    sphereBody.position.set(
      fixedParam.positionX,
      fixedParam.positionY,
      fixedParam.positionZ
    );

    const rotationQuaternion = new CANNON.Quaternion();
    rotationQuaternion.setFromAxisAngle(
      new CANNON.Vec3(
        fixedParam.rotationX,
        fixedParam.rotationY,
        fixedParam.rotationZ
      ),
      Math.PI / 4
    );
    sphereBody.quaternion.copy(rotationQuaternion);

    this.world.addBody(sphereBody);

    // Create Three.js sphere
    const sphereGeometry = new THREE.SphereGeometry(fixedParam.scale, 32, 32);
    const sphereMesh = new THREE.Mesh(sphereGeometry, fixedParam.material);

    sphereMesh.position.copy(sphereBody.position);
    sphereMesh.quaternion.copy(sphereBody.quaternion);

    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;

    this.scene.add(sphereMesh);
    this.boxes.push(sphereBody);
    this.boxMeshes.push(sphereMesh);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const time = performance.now() / 1000;
    const dt = time - this.lastCallTime;
    this.lastCallTime = time;

    if (this.controls.enabled) {
      this.world.step(this.timeStep, dt);

      // Update box positions
      for (let i = 0; i < this.boxes.length; i++) {
        this.boxMeshes[i].position.copy(this.boxes[i].position);
        this.boxMeshes[i].quaternion.copy(this.boxes[i].quaternion);
        if (this.boxes[i].role == "finish") {
          if (
            this.controls.cannonBody.position.y >
              this.boxes[i].position.y + 5 &&
            this.controls.cannonBody.position.y <
              this.boxes[i].position.y + 8 &&
            this.controls.cannonBody.position.x >
              this.boxes[i].position.x - 5 &&
            this.controls.cannonBody.position.x <
              this.boxes[i].position.x + 5 &&
            this.controls.cannonBody.position.z >
              this.boxes[i].position.z - 5 &&
            this.controls.cannonBody.position.z < this.boxes[i].position.z + 5
          ) {
            alert("next level");
            window.location.href = this.nextLevel;
          }
        }
      }
      if (this.controls.cannonBody.position.y < 2) {
        this.controls.unlock();
        alert("game_over");
        window.location.href = "";
      }
    }

    this.controls.update(dt);
    this.render(this.scene, this.camera);
  }
}
