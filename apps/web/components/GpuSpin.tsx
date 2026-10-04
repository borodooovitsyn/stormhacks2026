// Decorative 360 view of a GPU, pure CSS (see .gpu in globals.css).
export function GpuSpin() {
  return (
    <div className="gpu-stage" aria-hidden="true">
      <div className="gpu-tilt">
        <div className="gpu">
          <div className="gpu-face gpu-front">
            <div className="gpu-fan" />
            <div className="gpu-fan" />
          </div>
          <div className="gpu-face gpu-back">
            <div className="gpu-plate" />
          </div>
          <div className="gpu-face gpu-end gpu-right" />
          <div className="gpu-face gpu-end gpu-left" />
          <div className="gpu-face gpu-edge gpu-top" />
          <div className="gpu-face gpu-edge gpu-bottom" />
        </div>
      </div>
    </div>
  );
}
