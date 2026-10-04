import pytest

from services.api.app.jobs import InMemoryJobQueue, chunk_ranges


def test_chunk_ranges_are_balanced():
    assert chunk_ranges(total_units=10, requested_chunks=3) == [(0, 4), (4, 7), (7, 10)]


def test_chunk_ranges_do_not_create_empty_chunks():
    assert chunk_ranges(total_units=2, requested_chunks=5) == [(0, 1), (1, 2)]


@pytest.mark.parametrize(
    ("total_units", "requested_chunks"),
    [(0, 1), (1, 0), (-1, 2), (2, -1)],
)
def test_chunk_ranges_reject_invalid_inputs(total_units, requested_chunks):
    with pytest.raises(ValueError):
        chunk_ranges(total_units=total_units, requested_chunks=requested_chunks)


def test_queue_claims_each_chunk_once():
    queue = InMemoryJobQueue()
    job = queue.create_job(
        job_type="segmentation",
        image="gpu-share/imageproc:cpu",
        input_url="/uploads/batch-input",
        total_units=4,
        requested_chunks=2,
        job_id="job-test",
    )

    first = queue.claim_next("worker-a")
    second = queue.claim_next("worker-b")
    third = queue.claim_next("worker-c")

    assert len(job.chunk_ids) == 2
    assert first is not None
    assert second is not None
    assert third is None
    assert first.worker_id == "worker-a"
    assert second.worker_id == "worker-b"
    assert first.image == "gpu-share/imageproc:cpu"
    assert first.chunk_id != second.chunk_id


def test_queue_marks_claimed_chunk_complete():
    queue = InMemoryJobQueue()
    queue.create_job(
        job_type="segmentation",
        image="gpu-share/imageproc:cpu",
        input_url="/uploads/batch-input",
        total_units=1,
        requested_chunks=1,
        job_id="job-one",
    )
    chunk = queue.claim_next("worker-a")

    completed = queue.complete(chunk.chunk_id)

    assert completed is not None
    assert completed.status == "complete"
