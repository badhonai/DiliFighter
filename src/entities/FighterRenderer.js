export class FighterRenderer {
  constructor(fighter) {
    this.fighter = fighter;
  }

  render(ctx) {
    const f = this.fighter;
    const isShadow = f.shadowSystem.isActive;
    const dir = f.direction; // 1 for facing right, -1 for facing left

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir, 1);

    // Dynamic ground shadow
    this.renderGroundShadow(ctx, f, isShadow);

    // If in Shadow Mode, render active cyan aura
    if (isShadow) {
      this.renderShadowAura(ctx, f);
    }

    // Render Character Skeletal Poses
    this.renderFighterBody(ctx, f, isShadow);

    ctx.restore();
  }

  renderGroundShadow(ctx, f, isShadow) {
    // Shadow shrinks and lightens when fighter jumps
    const heightAboveGround = Math.max(0, 580 - f.y);
    const shadowScale = Math.max(0.4, 1 - heightAboveGround / 400);
    const alpha = (isShadow ? 0.6 : 0.4) * shadowScale;

    ctx.save();
    ctx.fillStyle = isShadow ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.45)';
    if (isShadow) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 42 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderShadowAura(ctx, f) {
    const pulse = Math.sin(f.shadowSystem.auraPulse) * 0.15 + 0.85;
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 22 * pulse;
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 * pulse})`;
    ctx.lineWidth = 3;
    
    // Silhouette ghost contour
    ctx.beginPath();
    ctx.ellipse(0, -50, 26, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  renderFighterBody(ctx, f, isShadow) {
    // Determine pose parameters based on state and current animation progress
    const pose = this.calculatePose(f);

    // Palette setup
    const isPlayer = f.isPlayer;
    let primaryColor, secondaryColor, accentColor, skinColor, weaponColor;

    if (isShadow) {
      primaryColor = '#0b0f17';
      secondaryColor = '#05070a';
      accentColor = '#00f0ff';
      skinColor = '#0b0f17';
      weaponColor = '#00f0ff';
    } else if (isPlayer) {
      // DILI: Midnight blue, gold trims, silver steel
      primaryColor = '#1e293b';
      secondaryColor = '#0f172a';
      accentColor = '#f59e0b'; // Gold
      skinColor = '#d97706';
      weaponColor = '#e2e8f0';
    } else {
      // TSUNAMI: Crimson samurai lacquer, charcoal, bronze
      primaryColor = '#7f1d1d';
      secondaryColor = '#450a0a';
      accentColor = '#fbbf24';
      skinColor = '#b45309';
      weaponColor = '#cbd5e1';
    }

    ctx.save();
    if (isShadow) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
    }

    // 1. Back Arm & Weapon
    this.renderArm(ctx, pose.backArm, primaryColor, secondaryColor, skinColor, weaponColor, isShadow, f, true);

    // 2. Back Leg
    this.renderLeg(ctx, pose.backLeg, primaryColor, secondaryColor, isShadow, true);

    // 3. Torso & Hips
    this.renderTorso(ctx, pose.torso, primaryColor, secondaryColor, accentColor, isShadow, f);

    // 4. Front Leg
    this.renderLeg(ctx, pose.frontLeg, primaryColor, secondaryColor, isShadow, false);

    // 5. Head & Helm / Hat
    this.renderHead(ctx, pose.head, skinColor, primaryColor, accentColor, isShadow, f);

    // 6. Front Arm & Weapon
    this.renderArm(ctx, pose.frontArm, primaryColor, secondaryColor, skinColor, weaponColor, isShadow, f, false);

    ctx.restore();
  }

  calculatePose(f) {
    const time = f.animTime;
    const state = f.state;
    const progress = f.actionProgress; // 0 to 1 during an action

    let pose = {
      torso: { y: -55, angle: 0 },
      head: { y: -88, angle: 0 },
      frontLeg: { hipY: -45, hipAngle: 0, kneeAngle: 0, footAngle: 0 },
      backLeg: { hipY: -45, hipAngle: 0, kneeAngle: 0, footAngle: 0 },
      frontArm: { shoulderY: -72, angle1: 0.3, angle2: 0.8 },
      backArm: { shoulderY: -72, angle1: -0.2, angle2: 0.6 },
    };

    switch (state) {
      case 'IDLE': {
        const breath = Math.sin(time * 3.5) * 2;
        pose.torso.y = -55 + breath;
        pose.head.y = -88 + breath * 1.2;
        // Natural martial arts stance
        pose.frontLeg.hipAngle = 0.25;
        pose.frontLeg.kneeAngle = -0.3;
        pose.backLeg.hipAngle = -0.35;
        pose.backLeg.kneeAngle = 0.4;
        
        pose.frontArm.angle1 = 0.4 + Math.sin(time * 3.5) * 0.05;
        pose.frontArm.angle2 = 1.1;
        pose.backArm.angle1 = -0.3 + Math.sin(time * 3.5 + 0.5) * 0.05;
        pose.backArm.angle2 = 0.9;
        break;
      }

      case 'WALK_FORWARD': {
        const stride = Math.sin(time * 9);
        pose.torso.angle = 0.12;
        pose.frontLeg.hipAngle = stride * 0.6;
        pose.frontLeg.kneeAngle = Math.max(0, -stride * 0.5);
        pose.backLeg.hipAngle = -stride * 0.6;
        pose.backLeg.kneeAngle = Math.max(0, stride * 0.5);
        pose.frontArm.angle1 = -stride * 0.4 + 0.3;
        pose.backArm.angle1 = stride * 0.4 - 0.2;
        break;
      }

      case 'WALK_BACK': {
        const stride = Math.sin(time * 7);
        pose.torso.angle = -0.08;
        pose.frontLeg.hipAngle = -stride * 0.45;
        pose.frontLeg.kneeAngle = Math.max(0, stride * 0.4);
        pose.backLeg.hipAngle = stride * 0.45;
        pose.backLeg.kneeAngle = Math.max(0, -stride * 0.4);
        pose.frontArm.angle1 = 0.6;
        pose.backArm.angle1 = -0.2;
        break;
      }

      case 'JUMP': {
        pose.torso.y = -50;
        pose.frontLeg.hipAngle = -0.8;
        pose.frontLeg.kneeAngle = 1.4;
        pose.backLeg.hipAngle = -0.5;
        pose.backLeg.kneeAngle = 1.2;
        pose.frontArm.angle1 = -1.2;
        pose.backArm.angle1 = -1.0;
        break;
      }

      case 'CROUCH': {
        pose.torso.y = -35;
        pose.torso.angle = 0.25;
        pose.head.y = -62;
        pose.frontLeg.hipAngle = 0.9;
        pose.frontLeg.kneeAngle = -1.4;
        pose.backLeg.hipAngle = -0.6;
        pose.backLeg.kneeAngle = 1.6;
        pose.frontArm.angle1 = 0.8;
        pose.backArm.angle1 = 0.2;
        break;
      }

      case 'BLOCK': {
        pose.torso.angle = -0.15;
        pose.frontArm.angle1 = -0.6;
        pose.frontArm.angle2 = 1.8;
        pose.backArm.angle1 = -0.4;
        pose.backArm.angle2 = 1.6;
        pose.frontLeg.hipAngle = 0.3;
        pose.backLeg.hipAngle = -0.4;
        break;
      }

      case 'HIT_STUN': {
        const shudder = Math.sin(time * 35) * 3;
        pose.torso.y = -55;
        pose.torso.angle = -0.35;
        pose.head.angle = -0.4;
        pose.frontArm.angle1 = -0.8 + shudder * 0.05;
        pose.backArm.angle1 = -0.6;
        pose.frontLeg.hipAngle = -0.2;
        pose.backLeg.hipAngle = -0.5;
        break;
      }

      case 'KNOCKDOWN': {
        const fall = Math.min(1, progress * 1.5);
        pose.torso.y = -20 + fall * 10;
        pose.torso.angle = -Math.PI / 2 * fall;
        pose.head.y = -20;
        pose.frontLeg.hipAngle = -1.2 * (1 - fall);
        pose.backLeg.hipAngle = -0.8 * (1 - fall);
        pose.frontArm.angle1 = -1.5;
        pose.backArm.angle1 = -1.2;
        break;
      }

      case 'ATTACKING': {
      this.applyAttackPose(f, pose, progress);
      break;
    }

    case 'DASH': {
      // Explosive lean into the burst (arms swept back, trailing leg)
      const fwd = f.dashDir * f.direction > 0; // dashing toward facing = forward
      pose.torso.angle = fwd ? 0.55 : -0.34;
      pose.torso.y = -52;
      pose.frontArm.angle1 = fwd ? -1.15 : 0.9;
      pose.backArm.angle1 = fwd ? -0.95 : 0.7;
      pose.frontLeg.hipAngle = fwd ? 0.95 : -0.7;
      pose.backLeg.hipAngle = fwd ? -0.85 : 0.8;
      pose.backLeg.kneeAngle = 0.9;
      break;
    }
    }

    return pose;
  }

  /**
   * Smooth keyframe track: pts = [[t, v], ...] with smoothstep easing
   * between keys — gives every attack proper anticipation -> snap -> settle
   * instead of the old pose-teleporting between 3 static stances.
   */
  static track(p, pts) {
    if (p <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (p <= pts[i][0]) {
        const [t0, v0] = pts[i - 1];
        const [t1, v1] = pts[i];
        const u = (p - t0) / (t1 - t0);
        const s = u * u * (3 - 2 * u);
        return v0 + (v1 - v0) * s;
      }
    }
    return pts[pts.length - 1][1];
  }

  applyAttackPose(f, pose, p) {
    const tr = FighterRenderer.track;
    const move = f.currentMove;
    if (!move) return;

    if (move.name.includes('Jab') || move.name.includes('Slash') || move.name.includes('Dao')
        || move.name.includes('Cleave') || move.name.includes('Kunai')) {
      // Horizontal blade slash / chain punches / kunai throw
      pose.torso.angle = tr(p, [[0, 0], [0.22, -0.28], [0.42, 0.32], [0.62, 0.3], [1, 0.06]]);
      pose.frontArm.angle1 = tr(p, [[0, 0.4], [0.22, -0.95], [0.42, 0.06], [0.72, 0.1], [1, 0.35]]);
      pose.frontArm.angle2 = tr(p, [[0, 1.1], [0.26, 1.4], [0.42, 0.05], [0.72, 0.2], [1, 0.75]]);
      pose.backArm.angle1 = tr(p, [[0, -0.3], [0.3, 0.35], [0.5, -0.55], [1, -0.25]]);
    } else if (move.name.includes('Uppercut') || move.name.includes('Rising')) {
      // Rising dragon anti-air: crouch load -> explosive rise
      pose.torso.y = tr(p, [[0, -55], [0.25, -38], [0.55, -68], [0.85, -62], [1, -55]]);
      pose.torso.angle = tr(p, [[0, 0], [0.3, 0.14], [0.55, -0.2], [1, 0]]);
      pose.frontArm.angle1 = tr(p, [[0, 0.4], [0.25, 0.95], [0.5, -2.3], [0.8, -2.15], [1, 0.4]]);
      pose.frontArm.angle2 = tr(p, [[0, 1.1], [0.3, 0.35], [0.5, 0.12], [1, 1.0]]);
      pose.backArm.angle1 = tr(p, [[0, -0.3], [0.4, -1.1], [0.8, -0.9], [1, -0.3]]);
    } else if (move.name.includes('Thrust') || move.name.includes('Piercer')) {
      // Lunging thrust: coil -> full extension
      pose.torso.angle = tr(p, [[0, 0], [0.2, -0.15], [0.4, 0.48], [1, 0.28]]);
      pose.frontLeg.hipAngle = tr(p, [[0, 0.25], [0.35, 0.85], [1, 0.7]]);
      pose.backLeg.hipAngle = tr(p, [[0, -0.35], [0.35, -0.95], [1, -0.8]]);
      pose.frontArm.angle1 = tr(p, [[0, 0.4], [0.2, -0.7], [0.4, 0.04], [1, 0.2]]);
      pose.frontArm.angle2 = tr(p, [[0, 0.8], [0.25, 1.3], [0.4, 0.04], [1, 0.5]]);
    } else if (move.name.includes('Sweep') || move.name.includes('Poke')) {
      // Low attacks: drop down -> leg/poke extends low
      pose.torso.y = tr(p, [[0, -55], [0.25, -52], [0.42, -28], [0.8, -40], [1, -52]]);
      pose.torso.angle = tr(p, [[0, 0.25], [0.3, 0.35], [0.5, 0.55], [1, 0.2]]);
      pose.frontLeg.hipAngle = tr(p, [[0, 0.9], [0.3, 0.4], [0.5, 1.45], [1, 1.0]]);
      pose.frontLeg.kneeAngle = tr(p, [[0, -1.4], [0.3, -0.8], [0.5, 0.08], [1, -1.0]]);
      pose.backLeg.hipAngle = tr(p, [[0, -0.6], [0.5, -0.85], [1, -0.65]]);
      pose.backLeg.kneeAngle = tr(p, [[0, 1.6], [0.5, 1.4], [1, 1.55]]);
      pose.frontArm.angle1 = tr(p, [[0, 0.8], [0.4, 0.2], [0.55, 0.05], [1, 0.7]]);
    } else if (move.name.includes('Kick') || move.name.includes('Roundhouse')) {
      // Kicks: chamber load -> snap extension -> relaxed recovery
      pose.torso.angle = tr(p, [[0, 0.12], [0.25, 0.12], [0.5, -0.28], [0.8, -0.2], [1, -0.02]]);
      pose.frontLeg.hipAngle = tr(p, [[0, 0.25], [0.25, -0.5], [0.45, 1.35], [0.72, 1.25], [1, 0.3]]);
      pose.frontLeg.kneeAngle = tr(p, [[0, -0.3], [0.25, 1.3], [0.45, 0.05], [0.72, 0.2], [1, -0.3]]);
      pose.frontArm.angle1 = tr(p, [[0, 0.4], [0.3, -0.6], [0.55, -0.9], [1, 0.4]]);
      pose.backArm.angle1 = tr(p, [[0, -0.2], [0.4, 0.5], [0.7, 0.4], [1, -0.2]]);
    } else if (move.name.includes('Eruption')) {
      // Ground slam eruption: gather up -> slam down
      pose.torso.y = tr(p, [[0, -55], [0.35, -68], [0.5, -32], [0.8, -42], [1, -52]]);
      pose.torso.angle = tr(p, [[0, 0], [0.4, -0.15], [0.55, 0.65], [1, 0.15]]);
      pose.frontArm.angle1 = tr(p, [[0, 0.3], [0.38, -2.1], [0.52, 1.25], [1, 0.3]]);
      pose.backArm.angle1 = tr(p, [[0, -0.2], [0.38, -1.8], [0.52, 1.0], [1, -0.2]]);
    } else if (move.name.includes('Splitter')) {
      // HEAVY_SMASH: rise tall -> massive two-handed overhead slam
      pose.torso.y = tr(p, [[0, -55], [0.3, -64], [0.48, -42], [0.75, -46], [1, -55]]);
      pose.torso.angle = tr(p, [[0, 0], [0.3, -0.35], [0.48, 0.58], [0.72, 0.5], [1, 0.08]]);
      pose.frontArm.angle1 = tr(p, [[0, 0.4], [0.3, -2.6], [0.48, 0.95], [0.75, 0.8], [1, 0.4]]);
      pose.frontArm.angle2 = tr(p, [[0, 1.1], [0.3, 0.45], [0.48, 0.3], [1, 0.9]]);
      pose.backArm.angle1 = tr(p, [[0, -0.2], [0.3, -2.45], [0.48, 0.75], [0.75, 0.6], [1, -0.2]]);
      pose.backArm.angle2 = tr(p, [[0, 0.6], [0.3, 0.35], [0.48, 0.35], [1, 0.6]]);
    }
  }

  renderTorso(ctx, torso, primary, secondary, accent, isShadow, f) {
    ctx.save();
    ctx.translate(0, torso.y);
    ctx.rotate(torso.angle);

    // Torso armor plate
    ctx.fillStyle = primary;
    ctx.strokeStyle = accent;
    ctx.lineWidth = isShadow ? 1 : 1.5;

    ctx.beginPath();
    ctx.moveTo(-16, -26);
    ctx.lineTo(16, -26);
    ctx.lineTo(12, 14);
    ctx.lineTo(-12, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chest emblem / Sash
    if (!isShadow) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-4, -20);
      ctx.lineTo(4, -20);
      ctx.lineTo(6, 12);
      ctx.lineTo(-6, 12);
      ctx.closePath();
      ctx.fill();

      // Flowing sash ribbons behind waist
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 12);
      ctx.quadraticCurveTo(-18, 25 + Math.sin(f.animTime * 4) * 4, -22, 36);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderHead(ctx, head, skin, primary, accent, isShadow, f) {
    ctx.save();
    ctx.translate(0, head.y);
    ctx.rotate(head.angle);

    // Head base
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    if (f.isPlayer) {
      // DILI: Martial headband / topknot
      ctx.fillStyle = primary;
      ctx.beginPath();
      ctx.arc(0, -3, 11.5, Math.PI, Math.PI * 2);
      ctx.fill();

      // Flowing headband ribbon
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-6, -4);
      ctx.quadraticCurveTo(-16, -6 + Math.sin(f.animTime * 5) * 3, -24, -2);
      ctx.stroke();
    } else {
      // TSUNAMI: Samurai Kasa Straw Cone Hat
      ctx.fillStyle = isShadow ? '#05070a' : '#854d0e';
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(24, 0);
      ctx.lineTo(0, -14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Eyes
    if (isShadow) {
      // Glowing Cyan Shadow Eyes
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(4, -1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(4, -1, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderLeg(ctx, leg, primary, secondary, isShadow, isBack) {
    ctx.save();
    ctx.translate(isBack ? -8 : 6, leg.hipY);
    ctx.rotate(leg.hipAngle);

    // Thigh
    ctx.fillStyle = isBack ? secondary : primary;
    ctx.fillRect(-6, 0, 12, 24);

    // Shin / Boot
    ctx.translate(0, 24);
    ctx.rotate(leg.kneeAngle);
    ctx.fillStyle = isBack ? '#020617' : '#0f172a';
    ctx.fillRect(-5, 0, 10, 26);

    // Foot
    ctx.translate(0, 26);
    ctx.fillRect(-4, 0, 14, 6);

    ctx.restore();
  }

  renderArm(ctx, arm, primary, secondary, skin, weaponColor, isShadow, f, isBack) {
    ctx.save();
    ctx.translate(isBack ? -12 : 10, arm.shoulderY);
    ctx.rotate(arm.angle1);

    // Upper Arm
    ctx.fillStyle = isBack ? secondary : primary;
    ctx.fillRect(-4, 0, 8, 20);

    // Forearm
    ctx.translate(0, 20);
    ctx.rotate(arm.angle2);
    ctx.fillStyle = skin;
    ctx.fillRect(-3.5, 0, 7, 18);

    // Weapon Hand
    ctx.translate(0, 18);

    // Render Weapon
    this.renderWeapon(ctx, weaponColor, isShadow, f, isBack);

    ctx.restore();
  }

  renderWeapon(ctx, weaponColor, isShadow, f, isBack) {
    ctx.save();
    if (isShadow) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
    }

    if (f.isPlayer) {
      // DILI: Twin Curved Dao / Scimitars
      ctx.strokeStyle = weaponColor;
      ctx.lineWidth = isShadow ? 4 : 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(15, -28, 8, -52);
      ctx.stroke();

      // Guard & Hilt
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-4, -2, 8, 4);
    } else {
      // TSUNAMI: Long Samurai Katana
      if (!isBack) {
        ctx.strokeStyle = weaponColor;
        ctx.lineWidth = isShadow ? 4.5 : 3;
        ctx.beginPath();
        ctx.moveTo(0, 4);
        ctx.quadraticCurveTo(12, -35, 18, -75);
        ctx.stroke();

        // Tsuba (Katana Guard)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.ellipse(0, 4, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
