export class Hitbox {
  constructor(x, y, width, height, type = 'hurtbox', properties = {}) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type; // 'hurtbox' | 'hitbox' | 'pushbox'
    this.properties = properties; // { damage, knockbackX, knockbackY, stunFrames, isLow, isHigh, isShadow }
  }

  get left() { return this.x - this.width / 2; }
  get right() { return this.x + this.width / 2; }
  get top() { return this.y - this.height; }
  get bottom() { return this.y; }

  intersects(other) {
    return !(
      this.right < other.left ||
      this.left > other.right ||
      this.bottom < other.top ||
      this.top > other.bottom
    );
  }

  debugDraw(ctx, color = 'rgba(255, 0, 0, 0.4)') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(this.left, this.top, this.width, this.height);
  }
}
